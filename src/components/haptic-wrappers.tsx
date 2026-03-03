"use client";

import * as React from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TabsTrigger } from "@/components/ui/tabs";
import { SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DropdownMenuCheckboxItem, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

// --- Button ---
type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

const HapticButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, variant, ...props }, ref) => {
    const { trigger } = useHaptics();
    const pattern = variant === "ghost" || variant === "outline" || variant === "link" ? "light" : "medium";
    return (
      <Button
        ref={ref}
        variant={variant}
        onClick={(e) => {
          trigger(pattern);
          onClick?.(e);
        }}
        {...props}
      />
    );
  }
);
HapticButton.displayName = "HapticButton";

// --- Checkbox ---
const HapticCheckbox = React.forwardRef<
  React.ComponentRef<typeof Checkbox>,
  React.ComponentPropsWithoutRef<typeof Checkbox>
>(({ onCheckedChange, ...props }, ref) => {
  const { trigger } = useHaptics();
  return (
    <Checkbox
      ref={ref}
      onCheckedChange={(checked) => {
        trigger("selection");
        onCheckedChange?.(checked);
      }}
      {...props}
    />
  );
});
HapticCheckbox.displayName = "HapticCheckbox";

// --- TabsTrigger ---
const HapticTabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ onClick, ...props }, ref) => {
  const { trigger } = useHaptics();
  return (
    <TabsTrigger
      ref={ref}
      onClick={(e) => {
        trigger("selection");
        onClick?.(e);
      }}
      {...props}
    />
  );
});
HapticTabsTrigger.displayName = "HapticTabsTrigger";

// --- SelectItem ---
const HapticSelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectItem>,
  React.ComponentPropsWithoutRef<typeof SelectItem>
>(({ onSelect, ...props }, ref) => {
  const { trigger } = useHaptics();
  return (
    <SelectItem
      ref={ref}
      onSelect={(e) => {
        trigger("selection");
        onSelect?.(e);
      }}
      {...props}
    />
  );
});
HapticSelectItem.displayName = "HapticSelectItem";

// --- Slider ---
const HapticSlider = React.forwardRef<
  React.ComponentRef<typeof Slider>,
  React.ComponentPropsWithoutRef<typeof Slider>
>(({ onValueCommit, ...props }, ref) => {
  const { trigger } = useHaptics();
  return (
    <Slider
      ref={ref}
      onValueCommit={(value) => {
        trigger("selection");
        onValueCommit?.(value);
      }}
      {...props}
    />
  );
});
HapticSlider.displayName = "HapticSlider";

// --- DropdownMenuCheckboxItem ---
const HapticDropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuCheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuCheckboxItem>
>(({ onSelect, ...props }, ref) => {
  const { trigger } = useHaptics();
  return (
    <DropdownMenuCheckboxItem
      ref={ref}
      onSelect={(e) => {
        trigger("light");
        onSelect?.(e);
      }}
      {...props}
    />
  );
});
HapticDropdownMenuCheckboxItem.displayName = "HapticDropdownMenuCheckboxItem";

// --- DropdownMenuRadioItem ---
const HapticDropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuRadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuRadioItem>
>(({ onSelect, ...props }, ref) => {
  const { trigger } = useHaptics();
  return (
    <DropdownMenuRadioItem
      ref={ref}
      onSelect={(e) => {
        trigger("selection");
        onSelect?.(e);
      }}
      {...props}
    />
  );
});
HapticDropdownMenuRadioItem.displayName = "HapticDropdownMenuRadioItem";

export {
  HapticButton,
  HapticCheckbox,
  HapticTabsTrigger,
  HapticSelectItem,
  HapticSlider,
  HapticDropdownMenuCheckboxItem,
  HapticDropdownMenuRadioItem,
};
