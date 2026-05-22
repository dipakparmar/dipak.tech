"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

type Item = { value: string; label: string }

export interface CountryComboboxProps {
  items: Item[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder: string
  disabled?: boolean
  emptyMessage?: string
}

export function CountryCombobox({
  items,
  value,
  onValueChange,
  placeholder,
  disabled,
  emptyMessage = "No matches",
}: CountryComboboxProps) {
  const selected = items.find((item) => item.value === value) ?? null

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(next) => {
        const item = next as Item | null
        onValueChange(item?.value ?? null)
      }}
      itemToStringLabel={(item) => (item as Item).label}
      itemToStringValue={(item) => (item as Item).value}
      disabled={disabled}
    >
      <ComboboxInput placeholder={placeholder} disabled={disabled} showClear={!!value} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: Item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
