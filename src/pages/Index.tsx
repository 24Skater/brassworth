import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Package, Shield, FileText, Search } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Home Inventory</h1>
          </div>
          <Button onClick={() => navigate('/auth')}>Get Started</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold mb-4 text-foreground">Track Your Property with Confidence</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Manage items in your home, church, or small organization. Keep records for insurance claims, warranties, and peace of mind.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Start Tracking Now
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">Organize Everything</h3>
            <p className="text-muted-foreground">
              Track items by room, category, and value. Upload photos and documents for each item.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">Insurance Ready</h3>
            <p className="text-muted-foreground">
              Generate detailed reports for insurance claims with photos, receipts, and valuations.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">Find Anything Fast</h3>
            <p className="text-muted-foreground">
              Search by name, brand, location, or category. Filter by value, condition, and more.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
