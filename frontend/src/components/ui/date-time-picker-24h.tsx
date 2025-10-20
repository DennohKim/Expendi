"use client";
 
import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns";
import { z } from "zod";
 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Validation schema for date/time selection
const dateTimeSchema = z.object({
  date: z.date().refine((date) => {
    const now = new Date();
    return date > now;
  }, "Date must be in the future").refine((date) => {
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    return date <= twoYearsFromNow;
  }, "Date cannot be more than 2 years in the future"),
});

interface DateTimePicker24hProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
  required?: boolean;
}
 
export function DateTimePicker24h({ 
  value, 
  onChange, 
  disabled = false,
  minDate,
  maxDate,
  error,
  required = false
}: DateTimePicker24hProps) {
  const [date, setDate] = React.useState<Date | undefined>(value);
  const [isOpen, setIsOpen] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
 
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  React.useEffect(() => {
    setDate(value);
  }, [value]);
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = date ? new Date(date) : new Date(selectedDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      
      // Validate the new date
      try {
        dateTimeSchema.parse({ date: newDate });
        setValidationError(null);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setValidationError(err.issues[0]?.message || "Invalid date");
        }
      }
      
      setDate(newDate);
      onChange?.(newDate);
    }
  };
 
  const isTimeDisabled = (hour: number, minute: number) => {
    if (!date) return false;
    
    const now = new Date();
    const selectedDate = new Date(date);
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    if (!isToday) return false;
    
    const selectedTime = new Date(selectedDate);
    selectedTime.setHours(hour, minute, 0, 0);
    
    // Allow times that are at least 5 minutes in the future
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    return selectedTime < fiveMinutesFromNow;
  };

  const handleTimeChange = (
    type: "hour" | "minute",
    value: string
  ) => {
    if (date) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(parseInt(value));
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      }
      
      // Validate the new date/time
      try {
        dateTimeSchema.parse({ date: newDate });
        setValidationError(null);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setValidationError(err.issues[0]?.message || "Invalid time");
        }
      }
      
      setDate(newDate);
      onChange?.(newDate);
    }
  };
 
  const displayError = error || validationError;

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              displayError && "border-red-500 focus:border-red-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "MM/dd/yyyy HH:mm")
            ) : (
              <span>Select date & time{required ? " *" : ""}</span>
            )}
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="sm:flex">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
          />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {hours.reverse().map((hour) => {
                  // For hour selection, check if ANY minute in that hour is selectable
                  const isDisabled = Array.from({ length: 12 }, (_, i) => i * 5)
                    .every(minute => isTimeDisabled(hour, minute));
                  return (
                    <Button
                      key={hour}
                      size="icon"
                      variant={date && date.getHours() === hour ? "default" : "ghost"}
                      className="sm:w-full shrink-0 aspect-square"
                      disabled={isDisabled}
                      onClick={() => handleTimeChange("hour", hour.toString())}
                    >
                      {hour.toString().padStart(2, '0')}
                    </Button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => {
                  const isDisabled = isTimeDisabled(date?.getHours() || 0, minute);
                  return (
                    <Button
                      key={minute}
                      size="icon"
                      variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                      className="sm:w-full shrink-0 aspect-square"
                      disabled={isDisabled}
                      onClick={() => handleTimeChange("minute", minute.toString())}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    {displayError && (
      <p className="text-sm text-red-500 flex items-center space-x-1">
        <span>{displayError}</span>
      </p>
    )}
    </div>
  );
}