"use client";

import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/ui/animated-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface Marketplace {
  id: string;
  name: string;
  slug: string;
}

export interface Price {
  id?: string;
  unitAmount: number;
  isDefault: boolean;
  paymentStyle: 'INSTANT' | 'REQUEST';
  allocatedQuantity: number;
  currency: 'USD';
  marketplaceId?: string;
}

interface PriceItemProps {
  price: Price;
  onDelete: () => void;
  onChange: (updatedPrice: Price) => void;
  isDefault: boolean;
  onSetDefault: () => void;
  disabled?: boolean;
  marketplaces: Marketplace[];
}

const PriceItem = ({ price, onDelete, onChange, isDefault, onSetDefault, disabled, marketplaces }: PriceItemProps) => {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border bg-card p-4",
        "transition-all duration-200 ease-in-out hover:shadow-md",
        isDefault && "border-2 border-primary ring-1 ring-primary"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-primary">$</span>
              <Input
                type="number"
                value={(price.unitAmount / 100).toFixed(2)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (isNaN(value) || value < 0) return;
                  onChange({ ...price, unitAmount: Math.round(value * 100) });
                }}
                className="w-24 text-lg font-medium"
                placeholder="0.00"
                disabled={disabled}
                step="0.01"
                min="0"
              />
            </div>
            <span className="text-xs text-muted-foreground">USD</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <Input
              type="number"
              value={price.allocatedQuantity}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 1) return;
                onChange({ ...price, allocatedQuantity: value });
              }}
              className="w-20"
              placeholder="Qty"
              disabled={disabled}
              min="1"
              step="1"
            />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <select
              value={price.paymentStyle}
              onChange={(e) => onChange({ ...price, paymentStyle: e.target.value as 'INSTANT' | 'REQUEST' })}
              disabled={disabled}
              className="w-32 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="INSTANT">Buy Now</option>
              <option value="REQUEST">Request</option>
            </select>
            <span className="text-xs text-muted-foreground">Payment Style</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <select
              value={price.marketplaceId || ''}
              onChange={(e) => onChange({ ...price, marketplaceId: e.target.value || undefined })}
              disabled={disabled}
              className="w-40 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">All Marketplaces</option>
              {marketplaces
                .filter(m => !price.marketplaceId || m.id === price.marketplaceId)
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">Marketplace</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isDefault ? "default" : "ghost"}
            size="sm"
            onClick={onSetDefault}
            disabled={disabled || isDefault}
            className="h-8"
          >
            {isDefault ? "Default" : "Make Default"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={disabled}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface PriceListProps {
  prices: Price[];
  onChange: (prices: Price[]) => void;
  className?: string;
  disabled?: boolean;
  marketplaces: Marketplace[];
}

export function PriceList({ prices, onChange, className, disabled, marketplaces }: PriceListProps) {
  const [defaultPriceId, setDefaultPriceId] = useState<string | undefined>(
    prices.find(p => p.isDefault)?.id
  );

  const handleAddPrice = () => {
    // Find available marketplaces (not already used)
    const usedMarketplaceIds = new Set(prices.map(p => p.marketplaceId).filter(Boolean));
    const availableMarketplaces = marketplaces.filter(m => !usedMarketplaceIds.has(m.id));

    const newPrice: Price = {
      unitAmount: 0,
      currency: "USD",
      isDefault: prices.length === 0,
      paymentStyle: "INSTANT",
      allocatedQuantity: 1,
      // If there's only one marketplace left, auto-select it
      marketplaceId: availableMarketplaces.length === 1 ? availableMarketplaces[0].id : undefined
    };
    onChange([...prices, newPrice]);
    if (prices.length === 0) {
      setDefaultPriceId(newPrice.id);
    }
  };

  const handleDeletePrice = (index: number) => {
    const newPrices = prices.filter((_, i) => i !== index);
    onChange(newPrices);
    if (prices[index].id === defaultPriceId && newPrices.length > 0) {
      setDefaultPriceId(newPrices[0].id);
      onChange(newPrices.map((p, i) => i === 0 ? { ...p, isDefault: true } : p));
    }
  };

  const handlePriceChange = (index: number, updatedPrice: Price) => {
    const newPrices = prices.map((p, i) => i === index ? updatedPrice : p);
    onChange(newPrices);
  };

  const handleSetDefault = (index: number) => {
    const newPrices = prices.map((p, i) => ({
      ...p,
      isDefault: i === index
    }));
    setDefaultPriceId(prices[index].id);
    onChange(newPrices);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Pricing Options</h3>
          <p className="text-sm text-muted-foreground">
            Add different pricing tiers for your product.
          </p>
        </div>
        <Button 
          type="button" 
          onClick={handleAddPrice} 
          variant="outline" 
          disabled={disabled}
          size="sm"
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Price
        </Button>
      </div>
      <div className="space-y-3">
        <AnimatedList>
          {prices.map((price, index) => (
            <PriceItem
              key={price.id || index}
              price={price}
              onDelete={() => handleDeletePrice(index)}
              onChange={(updatedPrice) => handlePriceChange(index, updatedPrice)}
              isDefault={price.id === defaultPriceId}
              onSetDefault={() => handleSetDefault(index)}
              disabled={disabled}
              marketplaces={marketplaces}
            />
          ))}
        </AnimatedList>
        {prices.length === 0 && (
          <div className="flex h-[100px] items-center justify-center rounded-lg border border-dashed">
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm text-muted-foreground">
                No prices added yet
              </p>
              <Button
                type="button"
                onClick={handleAddPrice}
                variant="ghost"
                disabled={disabled}
                size="sm"
                className="h-8"
              >
                Add your first price
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
