import {
  Book,
  FlaskConical,
  Landmark,
  Calculator,
  Feather,
  Globe,
  Palette,
  Music,
  HeartPulse,
  Code,
  Clapperboard,
  Users,
  Sprout,
  type LucideIcon,
} from 'lucide-react';

export const examCategories: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  General: { label: 'عمومی', icon: Book },
  Science: { label: 'علوم', icon: FlaskConical },
  History: { label: 'تاریخ', icon: Landmark },
  Math: { label: 'ریاضی', icon: Calculator },
  Literature: { label: 'ادبیات', icon: Feather },
  Geography: { label: 'جغرافیا', icon: Globe },
  Art: { label: 'هنر', icon: Palette },
  Music: { label: 'موسیقی', icon: Music },
  Sports: { label: 'ورزش', icon: HeartPulse },
  Programming: { label: 'برنامه نویسی', icon: Code },
  Cinema: { label: 'سینما', icon: Clapperboard },
  Religion: { label: 'دینی', icon: Sprout },
  Family: { label: 'خانواده', icon: Users },
};
