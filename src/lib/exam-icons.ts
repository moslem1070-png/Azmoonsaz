import {
  Library,
  Microscope,
  Hourglass,
  Map,
  PenTool,
  Brush,
  Guitar,
  Trophy,
  TerminalSquare,
  Film,
  HeartHandshake,
  Orbit,
  Milestone,
  Binary,
  type LucideIcon,
} from 'lucide-react';

export const examCategories: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  General: { label: 'عمومی', icon: Library },
  Science: { label: 'علوم', icon: Microscope },
  History: { label: 'تاریخ', icon: Hourglass },
  Math: { label: 'ریاضی', icon: Binary },
  Physics: { label: 'فیزیک', icon: Orbit },
  Literature: { label: 'ادبیات', icon: PenTool },
  Geography: { label: 'جغرافیا', icon: Map },
  Art: { label: 'هنر', icon: Brush },
  Music: { label: 'موسیقی', icon: Guitar },
  Sports: { label: 'ورزش', icon: Trophy },
  Programming: { label: 'برنامه نویسی', icon: TerminalSquare },
  Cinema: { label: 'سینما', icon: Film },
  Religion: { label: 'دینی', icon: Milestone },
  Family: { label: 'خانواده', icon: HeartHandshake },
};
