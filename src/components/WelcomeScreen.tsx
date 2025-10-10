
import React from "react";
import { Button } from "@/components/ui/button";
interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}
const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSuggestionClick
}) => {
  return <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
      <img 
        src="/lovable-uploads/0928bd3e-135a-451c-8467-7da995554b41.png" 
        alt="Elevate Your Data Logo" 
        className="h-auto w-48 mb-4"
      />
      <p className="text-gray-600 mb-6 max-w-3xl">Ask me anything and I'll do my best to assist you with your Airtable needs!</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
        <Button variant="outline" onClick={() => onSuggestionClick("How do I create a new base in Airtable?")} className="text-left justify-start h-auto py-3">
          Create a new base
        </Button>
        <Button variant="outline" onClick={() => onSuggestionClick("Show me how to use Airtable's API with Python")} className="text-left justify-start h-auto py-3">
          API integration help
        </Button>
        <Button variant="outline" onClick={() => onSuggestionClick("What are the best practices for organizing Airtable data?")} className="text-left justify-start h-auto py-3">
          Data organization tips
        </Button>
        <Button variant="outline" onClick={() => onSuggestionClick("How can I automate workflows in Airtable?")} className="text-left justify-start h-auto py-3">
          Workflow automation
        </Button>
      </div>
    </div>;
};
export default WelcomeScreen;
