import type { ComponentProps } from 'react';
import { cn } from '../cn';
import { inputClass, selectClass, textareaClass } from './styles';

export function Input({ className, ...props }: ComponentProps<'input'>) { return <input data-slot="input" className={cn(inputClass, className)} {...props} />; }
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) { return <textarea data-slot="textarea" className={cn(textareaClass, className)} {...props} />; }
/** Native select (works inside FormData forms) styled like the shadcn trigger. */
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) { return <select data-slot="select" className={cn(selectClass, className)} {...props}>{children}</select>; }
export function Label({ className, ...props }: ComponentProps<'label'>) { return <label data-slot="label" className={cn('text-[13px] font-medium text-ink', className)} {...props} />; }
