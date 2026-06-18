import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Star, Trash2, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCalendarEvents } from "@/hooks/use-calendar-events";

interface Props { userId: string | null; }

const ProgressCalendarTab = ({ userId }: Props) => {
  const [selected, setSelected] = useState<Date>(new Date());
  const [title, setTitle] = useState("");
  const [important, setImportant] = useState(false);
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarEvents(userId);

  const byDate = useMemo(() => {
    const m = new Map<string, { count: number; important: boolean }>();
    for (const e of events) {
      const cur = m.get(e.event_date) ?? { count: 0, important: false };
      cur.count += 1;
      if (e.important) cur.important = true;
      m.set(e.event_date, cur);
    }
    return m;
  }, [events]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.event_date === selectedKey);

  if (!userId) {
    return (
      <div className="rounded-2xl bg-card border p-6 text-center text-sm text-muted-foreground">
        Sign in with Google or email to use the cloud-synced calendar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border p-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => d && setSelected(d)}
          className={cn("p-3 pointer-events-auto")}
          modifiers={{
            hasEvent: (d) => byDate.has(format(d, "yyyy-MM-dd")),
            important: (d) => !!byDate.get(format(d, "yyyy-MM-dd"))?.important,
          }}
          modifiersClassNames={{
            hasEvent: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
            important: "ring-2 ring-amber-400/60",
          }}
        />
      </div>

      <div className="rounded-2xl bg-card border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{format(selected, "EEE, MMM d")}</h4>
          <span className="text-xs text-muted-foreground">{dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add event…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) {
                addEvent(selected, title.trim(), important);
                setTitle(""); setImportant(false);
              }
            }}
          />
          <Button
            size="icon"
            variant={important ? "default" : "outline"}
            onClick={() => setImportant((v) => !v)}
            title="Mark important"
          >
            <Star className={cn("h-4 w-4", important && "fill-current")} />
          </Button>
          <Button
            size="icon"
            onClick={() => {
              if (!title.trim()) return;
              addEvent(selected, title.trim(), important);
              setTitle(""); setImportant(false);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ul className="space-y-2">
          {dayEvents.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <button
                onClick={() => updateEvent(e.id, { important: !e.important })}
                className={cn("text-muted-foreground", e.important && "text-amber-500")}
                aria-label="toggle important"
              >
                <Star className={cn("h-4 w-4", e.important && "fill-current")} />
              </button>
              <span className="flex-1 text-sm">{e.title}</span>
              <button onClick={() => deleteEvent(e.id)} className="text-muted-foreground hover:text-destructive" aria-label="delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {dayEvents.length === 0 && (
            <li className="text-xs text-muted-foreground italic text-center py-3">No events for this day.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProgressCalendarTab;
