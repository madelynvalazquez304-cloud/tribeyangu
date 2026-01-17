import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Minus, Plus, Trash2, ShoppingBag, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CartSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const CartSheet: React.FC<CartSheetProps> = ({ isOpen, onClose }) => {
    const { items, removeItem, updateQuantity, total, itemCount, clearCart } = useCart();
    const { user } = useAuth();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');

    const handleCheckout = async () => {
        if (items.length === 0) return;
        if (!phoneNumber) {
            toast.error('Please enter your M-PESA phone number');
            return;
        }
        if (!customerName) {
            toast.error('Please enter your name');
            return;
        }
        if (!shippingAddress) {
            toast.error('Please enter your delivery address');
            return;
        }

        setIsCheckingOut(true);
        try {
            // For simplicity in this demo, we'll process each creator's items as one order 
            // but M-Pesa STK usually handles one transaction. 
            // We'll calculate the total and send one STK push.

            const response = await supabase.functions.invoke('mpesa-stk', {
                body: {
                    phone: phoneNumber,
                    amount: total,
                    // We'll use the first item's creatorId for the transaction record mapping
                    creatorId: items[0].creatorId,
                    donorName: customerName,
                    type: 'merchandise',
                    metadata: {
                        items: items.map(i => ({
                            id: i.id,
                            name: i.name,
                            qty: i.quantity,
                            unit_price: i.price
                        })),
                        customerName,
                        phoneNumber,
                        address: shippingAddress
                    }
                }
            });

            if (response.error) throw response.error;

            if (response.data?.success) {
                toast.success('STK Push sent! Please complete payment on your phone.');
                // In a real app, we'd poll for status, but for now we'll just clear and close
                clearCart();
                onClose();
            } else {
                throw new Error(response.data?.error || 'Checkout failed');
            }
        } catch (error: any) {
            console.error('Checkout error:', error);
            toast.error(error.message || 'Failed to initiate checkout');
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        Your Cart ({itemCount})
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-hidden py-4">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                            <h3 className="text-lg font-medium">Your cart is empty</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Browse our store and add some items to your cart!
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-4 p-3 rounded-xl bg-secondary/30">
                                        <div className="w-20 h-20 rounded-lg bg-secondary/50 flex-shrink-0 overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                                                <p className="text-primary font-bold text-sm mt-1">
                                                    KES {item.price.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 bg-background rounded-lg border p-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="p-1 hover:bg-secondary rounded"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="p-1 hover:bg-secondary rounded"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-destructive p-1 hover:bg-destructive/10 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {items.length > 0 && (
                    <SheetFooter className="flex-col border-t pt-6 gap-4">
                        <div className="space-y-4 w-full">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="checkout-name" className="text-xs">Your Name</Label>
                                    <Input
                                        id="checkout-name"
                                        placeholder="John Doe"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="checkout-phone" className="text-xs">M-PESA Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <Input
                                            id="checkout-phone"
                                            placeholder="0712345678"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="pl-9 h-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="checkout-address" className="text-xs">Shipping Address</Label>
                                    <Textarea
                                        id="checkout-address"
                                        placeholder="E.g., Apartment 4B, Westlands, Nairobi"
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        className="min-h-[80px] text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>KES {total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-primary">KES {total.toLocaleString()}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full gap-2 h-11"
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                            >
                                {isCheckingOut ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>Checkout with M-PESA</>
                                )}
                            </Button>
                        </div>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default CartSheet;
