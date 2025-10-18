"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Calendar24Props {
  onDateChange?: (date: Date | undefined) => void;
  onTimeChange?: (time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function Calendar24({
  onDateChange,
  onTimeChange,
  selectedDate,
  selectedTime,
  disabled = false,
  minDate,
  maxDate,
}: Calendar24Props) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(selectedDate)
  const [time, setTime] = React.useState<string>(selectedTime || "10:30")

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    onDateChange?.(newDate)
    setOpen(false)
  }

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value
    setTime(newTime)
    onTimeChange?.(newTime)
  }

  // Update internal state when props change
  React.useEffect(() => {
    setDate(selectedDate)
  }, [selectedDate])

  React.useEffect(() => {
    setTime(selectedTime || "10:30")
  }, [selectedTime])

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-3">
        <Label htmlFor="date-picker" className="px-1">
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              disabled={disabled}
              className="w-40 justify-between font-normal"
            >
              {date ? date.toLocaleDateString() : "Select date"}
              <ChevronDownIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="time-picker" className="px-1">
          Time
        </Label>
        <Input
          type="time"
          id="time-picker"
          value={time}
          onChange={handleTimeChange}
          disabled={disabled}
          className="w-32 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}