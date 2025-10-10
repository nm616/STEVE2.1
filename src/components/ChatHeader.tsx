
import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface ChatHeaderProps {
  onLogout: () => Promise<void>;
  isActMode: boolean;
  onModeToggle: (isActMode: boolean) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onLogout, isActMode, onModeToggle }) => {
  return (
    <header className="px-4 py-3 bg-background border-b border-border shadow-sm">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-elevate-primary flex items-center justify-center">
            <span className="text-white font-bold">E</span>
          </div>
          <h1 className="font-semibold text-lg">Elevate Chat</h1>
        </div>
        
        {/* Mode Toggle - Temporarily Hidden */}
        {/* <div className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
          <span className={`text-sm font-medium transition-colors ${!isActMode ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            Chat
          </span>
          <Switch
            checked={isActMode}
            onCheckedChange={onModeToggle}
            className="data-[state=checked]:bg-primary"
          />
          <span className={`text-sm font-medium transition-colors ${isActMode ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            Act
          </span>
        </div> */}
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
