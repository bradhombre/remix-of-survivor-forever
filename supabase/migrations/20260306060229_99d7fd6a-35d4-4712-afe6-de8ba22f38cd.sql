CREATE POLICY "Super admins can view all chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));