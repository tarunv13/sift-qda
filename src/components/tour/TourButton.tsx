import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import type { TourId } from "./steps";
import { useTour } from "./TourContext";

export function TourButton({ tour }: { tour: TourId }) {
  const { start } = useTour();
  return (
    <Button size="sm" variant="ghost" onClick={() => start(tour)} title="Show the guided tour">
      <Icon name="compass" size={13} />
      Tour
    </Button>
  );
}
