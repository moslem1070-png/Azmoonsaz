import {
  Book,
  FlaskConical,
  Landmark,
  Pi,
  Feather,
  Globe,
  Palette,
  Music,
  Dumbbell,
  Code,
  Clapperboard,
  Users,
  Atom,
  type LucideIcon,
  BookOpen,
} from 'lucide-react';

export const examCategories: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  General: { label: 'عمومی', icon: Book },
  Science: { label: 'علوم', icon: FlaskConical },
  History: { label: 'تاریخ', icon: Feather },
  Math: { label: 'ریاضی', icon: Pi },
  Physics: { label: 'فیزیک', icon: Atom },
  Literature: { label: 'ادبیات', icon: Feather },
  Geography: { label: 'جغرافیا', icon: Globe },
  Art: { label: 'هنر', icon: Palette },
  Music: { label: 'موسیقی', icon: Music },
  Sports: { label: 'ورزش', icon: Dumbbell },
  Programming: { label: 'برنامه نویسی', icon: Code },
  Cinema: { label: 'سینما', icon: Clapperboard },
  Religion: { label: 'دینی', icon: Landmark },
  Family: { label: 'خانواده', icon: Users },
};
