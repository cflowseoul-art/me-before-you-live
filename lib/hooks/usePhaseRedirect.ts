"use client";

import { useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Phase types for the event flow
 * auction -> feed -> report
 */
type Phase = "auction" | "feed" | "report";

interface SystemSettings {
  current_phase: string;
  is_feed_open: string;
  is_report_open: string;
  current_session: string;
}

interface UsePhaseRedirectOptions {
  /** Current page context - determines redirect behavior */
  currentPage: Phase;
  /** Callback when settings are fetched (for additional data loading) */
  onSettingsFetched?: (settings: SystemSettings) => void;
  /** Custom callback for auction_items changes (only for auction page) */
  onAuctionItemsChange?: () => void;
  /** Custom callback for feed_likes changes (only for feed page) */
  onFeedLikesChange?: () => void;
  /** Custom callback for bids changes (only for auction page) */
  onBidsChange?: () => void;
  /** Custom callback for users changes (only for auction page) */
  onUsersChange?: () => void;
}

/**
 * Unified Realtime listener hook for system_settings
 * Enforces global state-based redirects using window.location.href
 * All values are treated as TEXT type (string comparison)
 */
export function usePhaseRedirect(options: UsePhaseRedirectOptions) {
  const { currentPage, onSettingsFetched, onAuctionItemsChange, onFeedLikesChange, onBidsChange, onUsersChange } = options;

  // Get user ID from localStorage
  const getUserId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("auction_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored).id;
    } catch {
      return null;
    }
  }, []);

  // Redirect based on current phase and page
  const handleRedirect = useCallback((settings: SystemSettings) => {
    const userId = getUserId();

    // Strict TEXT type comparison - all values are strings
    const isFeedOpen = String(settings.is_feed_open) === "true";
    const isReportOpen = String(settings.is_report_open) === "true";

    console.log(`🔄 Phase check on [${currentPage}]:`, { isFeedOpen, isReportOpen });

    switch (currentPage) {
      case "auction":
        // From auction: report takes priority, then feed
        if (isReportOpen && userId) {
          console.log("🏁 Redirecting to report from auction");
          window.location.href = `/1on1/loading/${userId}`;
          return true;
        }
        if (isFeedOpen) {
          console.log("📸 Redirecting to feed from auction");
          window.location.href = "/feed";
          return true;
        }
        break;

      case "feed":
        // From feed: report takes priority, auction if feed closed
        if (isReportOpen && userId) {
          console.log("🏁 Redirecting to report from feed");
          window.location.href = `/1on1/loading/${userId}`;
          return true;
        }
        if (!isFeedOpen) {
          console.log("🔙 Redirecting to auction from feed (feed closed)");
          window.location.href = "/auction";
          return true;
        }
        break;

      case "report":
        // From report: go back to feed or auction if report closed
        if (!isReportOpen) {
          if (isFeedOpen) {
            console.log("📸 Redirecting to feed from report");
            window.location.href = "/feed";
          } else {
            console.log("🔙 Redirecting to auction from report");
            window.location.href = "/auction";
          }
          return true;
        }
        break;
    }

    return false;
  }, [currentPage, getUserId]);

  // Fetch initial settings and check for redirect
  const fetchAndCheckSettings = useCallback(async (): Promise<SystemSettings | null> => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value");

    if (error || !data) {
      console.error("Failed to fetch settings:", error);
      return null;
    }

    const settings: SystemSettings = {
      current_phase: "",
      is_feed_open: "false",
      is_report_open: "false",
      current_session: "01"
    };

    data.forEach(row => {
      const key = row.key as keyof SystemSettings;
      if (key in settings) {
        settings[key] = String(row.value); // Ensure TEXT type
      }
    });

    console.log("📋 Fetched settings:", settings);

    // Check if redirect is needed
    const redirected = handleRedirect(settings);

    if (!redirected && onSettingsFetched) {
      onSettingsFetched(settings);
    }

    return redirected ? null : settings;
  }, [handleRedirect, onSettingsFetched]);

  useEffect(() => {
    // Initial fetch
    fetchAndCheckSettings();

    console.log(`🔔 Starting unified Realtime listener on [${currentPage}] page...`);

    // Create channel with unique name per page
    const channelName = `phase_redirect_${currentPage}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Always listen to system_settings changes
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "system_settings" },
      (payload: any) => {
        const { key, value } = payload.new;
        // Ensure TEXT type handling
        const stringValue = String(value);

        console.log(`⚙️ [${currentPage}] Settings changed:`, key, "->", stringValue);

        // Build partial settings object for redirect check
        const userId = getUserId();

        // Handle specific key changes with strict TEXT comparison
        if (key === "is_report_open") {
          if (stringValue === "true" && currentPage !== "report" && userId) {
            console.log("🏁 Report opened - redirecting to report");
            window.location.href = `/1on1/loading/${userId}`;
          } else if (stringValue === "false" && currentPage === "report") {
            console.log("🔄 Report closed - checking where to redirect");
            fetchAndCheckSettings();
          }
        } else if (key === "is_feed_open") {
          if (stringValue === "true" && currentPage === "auction") {
            console.log("📸 Feed opened - redirecting to feed");
            window.location.href = "/feed";
          } else if (stringValue === "false" && currentPage === "feed") {
            console.log("🔙 Feed closed - redirecting to auction");
            window.location.href = "/auction";
          }
        }
      }
    );

    // Add auction_items listener if on auction page
    if (currentPage === "auction" && onAuctionItemsChange) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auction_items" },
        (payload) => {
          console.log("♻️ Auction items changed:", payload.eventType);
          onAuctionItemsChange();
        }
      );
    }

    // Add feed_likes listener if on feed page
    if (currentPage === "feed" && onFeedLikesChange) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feed_likes" },
        (payload) => {
          console.log("❤️ Feed likes changed:", payload.eventType);
          onFeedLikesChange();
        }
      );
    }

    // Add bids listener if on auction page
    if (currentPage === "auction" && onBidsChange) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids" },
        (payload) => {
          console.log("💰 Bids changed:", payload.eventType);
          onBidsChange();
        }
      );
    }

    // Add users listener if on auction page
    if (currentPage === "auction" && onUsersChange) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          console.log("👤 Users changed:", payload.eventType);
          onUsersChange();
        }
      );
    }

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log(`📡 [${currentPage}] Subscription status:`, status);
    });

    // Cleanup
    return () => {
      console.log(`🔌 [${currentPage}] Unsubscribing from Realtime`);
      supabase.removeChannel(channel);
    };
  }, [currentPage, fetchAndCheckSettings, getUserId, onAuctionItemsChange, onFeedLikesChange, onBidsChange, onUsersChange]);

  return { fetchAndCheckSettings, getUserId };
}
