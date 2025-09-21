import { cva } from 'class-variance-authority'
import { clsx } from 'clsx'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        outline: 'border bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
        link: 'text-primary-600 underline underline-offset-4'
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3',
        lg: 'h-12 px-6'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export function Button({ className, variant, size, ...props }) {
  return (
    <button className={clsx(buttonVariants({ variant, size }), className)} {...props} />
  )
}
