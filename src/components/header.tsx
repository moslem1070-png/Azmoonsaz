import Link from "next/link";
import { BookOpen, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  return (
    <header className="sticky top-0 z-50">
        <div className="container mx-auto px-4">
            <div className="mt-4 flex h-16 items-center justify-between rounded-[30px] border border-white/20 bg-white/10 px-6 backdrop-blur-lg">
                <Link href="/" className="flex items-center gap-3">
                    <div className="p-2 bg-primary/80 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Persian QuizMaster</h1>
                </Link>
                <Avatar>
                    <AvatarImage src="https://picsum.photos/seed/avatar/100/100" />
                    <AvatarFallback>
                        <User />
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
    </header>
  );
};

export default Header;
