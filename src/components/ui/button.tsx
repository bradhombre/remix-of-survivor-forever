import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const plank =
  "border-2 border-plank border-b-4 active:border-b-2 active:translate-y-[2px] disabled:border-b-2";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold rounded-[10px] transition-[transform,border-width,background-color,color] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:bg-primary/90 ${plank}`,
        destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90 ${plank}`,
        outline: `bg-card text-foreground hover:bg-muted ${plank}`,
        secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/90 ${plank}`,
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: `bg-success text-success-foreground hover:bg-success/90 ${plank}`,
        accent: `bg-accent text-accent-foreground hover:bg-accent/90 ${plank}`,
        glass: `bg-card text-foreground hover:bg-muted ${plank}`,
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 rounded-xl px-10 text-base font-extrabold",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
