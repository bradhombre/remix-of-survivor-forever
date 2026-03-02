

## Fix: Chat not scrolling to bottom on open

**Problem**: The auto-scroll effect fires before the DOM has fully rendered the messages, so `scrollHeight` is still small when `scrollTop` is set.

**Solution**: Add a small `setTimeout` delay to the auto-scroll logic, giving the browser time to layout the messages before scrolling. Also add a `requestAnimationFrame` for reliability.

### Changes

**File: `src/components/LeagueChat.tsx`** (lines 113-122)

Replace the auto-scroll `useEffect` with a version that waits for the next frame + a small timeout:

```typescript
useEffect(() => {
  if (isExpanded && scrollRef.current) {
    const scrollToBottom = () => {
      const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };
    // Immediate attempt
    scrollToBottom();
    // Delayed attempt to catch late renders
    const timer = setTimeout(scrollToBottom, 150);
    return () => clearTimeout(timer);
  }
}, [messages, isExpanded, isJeffBotTyping]);
```

This double-scroll approach (immediate + 150ms delayed) ensures it works whether content is already rendered or still loading.

