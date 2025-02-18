"use client";

import { ShoppingCart, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart, formatPrice } from "@/lib/cart";
import Image from "next/image";

export function CartDropdown() {
  const { state, dispatch } = useCart();
  const itemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);
  const total = state.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: state.items }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-transparent"
        >
          <ShoppingCart className="h-5 w-5 text-[#666666]" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#F97316] text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[380px] p-0 bg-white/95 backdrop-blur-md border-[#E5E5E5]"
      >
        <div className="h-24 flex items-center px-6 border-b border-[#E5E5E5]">
          <SheetTitle className="flex-1 font-display text-xl font-bold tracking-tight text-[#453E3E]">
            Shopping Cart
          </SheetTitle>
          {itemCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: "CLEAR_CART" })}
              className="text-sm text-[#666666] hover:text-[#453E3E] mr-6"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="px-6 py-6 flex-1 overflow-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#666666]">
              <ShoppingCart className="h-12 w-12 mb-4 text-[#E5E5E5]" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-white rounded-lg border border-[#E5E5E5]"
                >
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-[#faf9f7]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-[#453E3E] truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-[#666666]">
                      {formatPrice(item.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_QUANTITY",
                            payload: {
                              id: item.id,
                              quantity: Math.max(0, item.quantity - 1),
                            },
                          })
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_QUANTITY",
                            payload: {
                              id: item.id,
                              quantity: item.quantity + 1,
                            },
                          })
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[#666666] hover:text-[#453E3E]"
                    onClick={() =>
                      dispatch({ type: "REMOVE_ITEM", payload: item.id })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {state.items.length > 0 && (
          <div className="border-t border-[#E5E5E5] p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-[#453E3E]">Total</span>
              <span className="font-bold text-lg text-[#453E3E]">
                {formatPrice(total)}
              </span>
            </div>
            <Button
              onClick={handleCheckout}
              className="w-full bg-[#453E3E] hover:bg-[#2A2424] text-white"
            >
              Checkout
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
