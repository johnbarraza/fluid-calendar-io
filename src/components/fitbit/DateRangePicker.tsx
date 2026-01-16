"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";

interface DateRangePickerProps {
    value: number;
    onChange: (days: number) => void;
}

const options = [
    { label: "Hoy", value: 1 },
    { label: "7 días", value: 7 },
    { label: "14 días", value: 14 },
    { label: "30 días", value: 30 },
    { label: "3 meses", value: 90 },
    { label: "1 año", value: 365 },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const currentLabel = options.find((opt) => opt.value === value)?.label ?? `${value} días`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{currentLabel}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={value === option.value ? "bg-accent font-medium" : ""}
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

