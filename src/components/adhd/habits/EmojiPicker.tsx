"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuDice3 as Dice, LuSearch as Search } from "react-icons/lu";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

// Comprehensive emoji categories for habits
const EMOJI_CATEGORIES = {
  "Salud y Fitness": [
    "💪", "🏃", "🚴", "🏊", "🧘", "🤸", "🏋️", "🥗", "🍎", "🥤",
    "😴", "🛌", "💊", "🧑‍⚕️", "❤️", "🫀", "🦴", "🦷", "👟", "⚡"
  ],
  "Productividad": [
    "📚", "✍️", "📝", "💻", "📊", "📈", "🎯", "✅", "📌", "📋",
    "🗓️", "⏰", "⏱️", "📱", "💡", "🧠", "🎓", "📖", "✏️", "🖊️"
  ],
  "Creatividad": [
    "🎨", "🎭", "🎪", "🎬", "🎵", "🎸", "🎹", "🎤", "📷", "📸",
    "🖌️", "🖍️", "✂️", "📐", "🎼", "🎧", "🎮", "🧩", "🪡", "🧶"
  ],
  "Relaciones": [
    "👨‍👩‍👧‍👦", "💑", "👫", "👬", "👭", "🤝", "💬", "📞", "💌", "❤️‍🔥",
    "🫂", "👥", "🤗", "💝", "🎁", "🌹", "☕", "🍽️", "🎉", "🥳"
  ],
  "Bienestar": [
    "🧘‍♀️", "🧘‍♂️", "☮️", "🕉️", "🙏", "💆", "💅", "🛀", "🌅", "🌄",
    "🌺", "🌸", "🌼", "🌻", "🦋", "🍃", "🌿", "🌱", "☀️", "🌙"
  ],
  "Aprendizaje": [
    "📚", "📖", "📕", "📗", "📘", "📙", "📓", "📔", "📒", "📝",
    "🔬", "🔭", "🧪", "🧬", "🎓", "🏫", "🖊️", "✏️", "📐", "🧮"
  ],
  "Hogar": [
    "🏠", "🧹", "🧺", "🧽", "🧼", "🪣", "🧴", "🧻", "🗑️", "♻️",
    "🛏️", "🪑", "🚪", "🪟", "💡", "🕯️", "🌡️", "🔧", "🔨", "🪛"
  ],
  "Finanzas": [
    "💰", "💵", "💴", "💶", "💷", "💳", "💎", "🏦", "📊", "📈",
    "📉", "💹", "🧾", "📋", "🎯", "💼", "🏪", "🛒", "🔖", "💸"
  ],
  "Naturaleza": [
    "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂",
    "🍃", "🪴", "🌺", "🌻", "🌼", "🌷", "🌹", "🥀", "🌸", "💐"
  ],
  "Comida": [
    "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍑", "🍒",
    "🥗", "🥙", "🥪", "🌮", "🌯", "🥑", "🥕", "🥦", "🥒", "🍅"
  ]
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);

  // Flatten all emojis for search
  const allEmojis = React.useMemo(() => {
    return Object.values(EMOJI_CATEGORIES).flat();
  }, []);

  // Filter emojis based on search (currently just filters by category name)
  const filteredCategories = React.useMemo(() => {
    if (!search) return EMOJI_CATEGORIES;

    const searchLower = search.toLowerCase();
    const filtered: Record<string, string[]> = {};

    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      if (category.toLowerCase().includes(searchLower)) {
        filtered[category] = emojis;
      }
    });

    return filtered;
  }, [search]);

  const handleRandomEmoji = () => {
    const randomEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
    onChange(randomEmoji);
    setOpen(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-20 w-20 text-4xl p-0"
          type="button"
        >
          {value || "😊"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex flex-col">
          {/* Header */}
          <div className="border-b p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Selecciona un icono</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRandomEmoji}
                type="button"
                className="h-8"
              >
                <Dice className="h-4 w-4 mr-2" />
                Aleatorio
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Emoji Grid */}
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
            {Object.entries(filteredCategories).map(([category, emojis]) => (
              <div key={category}>
                <h5 className="text-xs font-medium text-muted-foreground mb-2">
                  {category}
                </h5>
                <div className="grid grid-cols-10 gap-1">
                  {emojis.map((emoji, index) => (
                    <button
                      key={`${category}-${index}`}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="h-8 w-8 flex items-center justify-center text-xl hover:bg-accent rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(filteredCategories).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No se encontraron categorías
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
