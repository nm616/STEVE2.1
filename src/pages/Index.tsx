import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
const Index: React.FC = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  return <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-center max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center my-[200px]">
          <img alt="Elevate Your Data Logo" src="/lovable-uploads/74485e70-1bc1-49b7-b150-02a2304170ec.png" className="h-auto w-80 md:w-96 mb-6 object-fill" />
          
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Powerful AI assistant for Elevate team members
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? <Button onClick={() => navigate("/chat")} className="bg-blue-600 hover:bg-blue-700 text-white py-6 px-10 text-lg w-full sm:w-auto">
                Go to Chat
              </Button> : <>
                <Button onClick={() => navigate("/login")} className="bg-blue-600 hover:bg-blue-700 text-white py-6 px-10 text-lg w-full sm:w-auto">
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate("/signup")} className="border-blue-600 text-blue-600 hover:bg-blue-50 py-6 px-10 text-lg w-full sm:w-auto">
                  Create Account
                </Button>
              </>}
          </div>
        </div>
      </div>
      
      <footer className="mt-auto py-6 text-center text-gray-500 w-full">
        <p>© {new Date().getFullYear()} Elevate. All rights reserved.</p>
      </footer>
    </div>;
};
export default Index;