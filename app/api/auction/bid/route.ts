import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { itemId, userId, bidAmount } = await request.json();

    if (!itemId || !userId || !bidAmount) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. 현재 아이템 상태 확인
    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('auction_items')
      .select('status, current_bid, highest_bidder_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !currentItem) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    if (currentItem.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Auction is not active' }, { status: 400 });
    }

    const previousBidderId = currentItem.highest_bidder_id;
    const previousBidAmount = currentItem.current_bid || 0;
    const isSameBidder = previousBidderId === userId;

    // 2. 최소 입찰가 확인
    const minBid = previousBidAmount + 100;
    if (bidAmount < minBid) {
      return NextResponse.json({
        success: false,
        error: `Minimum bid is ${minBid}`,
        minBid
      }, { status: 400 });
    }

    // 3. 유저 잔액 + 세션 확인
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('balance, session_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // 차감할 금액 계산
    const amountToDeduct = isSameBidder ? (bidAmount - previousBidAmount) : bidAmount;

    if (userData.balance < amountToDeduct) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance',
        required: amountToDeduct,
        current: userData.balance
      }, { status: 400 });
    }

    // 4. 이전 입찰자에게 환불 (다른 사용자인 경우)
    if (!isSameBidder && previousBidderId && previousBidAmount > 0) {
      const { data: prevUser } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', previousBidderId)
        .single();

      if (prevUser) {
        await supabaseAdmin
          .from('users')
          .update({ balance: prevUser.balance + previousBidAmount })
          .eq('id', previousBidderId);
      }
    }

    // 5. 경매 아이템 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('auction_items')
      .update({ current_bid: bidAmount, highest_bidder_id: userId })
      .eq('id', itemId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 6. 입찰 기록 추가 (세션 포함)
    await supabaseAdmin
      .from('bids')
      .insert({ auction_item_id: itemId, user_id: userId, amount: bidAmount, session_id: userData.session_id || null });

    // 7. 유저 잔액 차감
    const newBalance = userData.balance - amountToDeduct;
    await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      bidAmount,
      newBalance,
      previousBidAmount,
      amountDeducted: amountToDeduct
    });

  } catch (err: any) {
    console.error('Bid API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
