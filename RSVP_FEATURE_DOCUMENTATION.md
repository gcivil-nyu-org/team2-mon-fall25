# RSVP Feature - Frontend Implementation & Backend Integration Guide

## Overview
This document describes the frontend UI/UX implementation for the RSVP feature and provides guidance for backend integration.

**Status:** Frontend UI mockup complete (no backend integration yet)
**Date:** 2025-11-27

---

## 1. Frontend Changes Summary

### Files Modified
1. **`frontend/src/components/modals/EventDetailsModal.tsx`**
   - Added RSVP button group for attendees (Accept/Decline/Tentative)
   - Added RSVP summary display for event creators
   - Added individual attendee RSVP status display

2. **`frontend/src/components/calendar/CalendarWeek.tsx`**
   - Added visual color coding for RSVP status on calendar events
   - Pending: Amber left border
   - Declined: 50% opacity + red tint overlay
   - Tentative: Dashed orange border

3. **`frontend/src/components/calendar/Agenda.tsx`**
   - Added RSVP status badges next to event titles
   - Added RSVP summary for event creators (accepted/tentative/declined/pending counts)

---

## 2. Type Definitions

### RSVP Status Type
```typescript
type RSVPStatus = "pending" | "accepted" | "declined" | "tentative";
```

### CalEvent Type (Updated)
```typescript
export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind?: "meeting" | "unavailable";
  description?: string;
  location?: string;
  createdBy?: number;
  createdByName?: string;
  attendeesNames?: string[];

  // NEW RSVP FIELDS (to be populated by backend)
  userRsvpStatus?: RSVPStatus;  // Current user's RSVP status for this event
  rsvpSummary?: {                // Summary for event creators
    accepted: number;
    declined: number;
    tentative: number;
    pending: number;
  };
  attendeesWithRsvp?: Array<{    // Full attendee list with statuses
    name: string;
    status: RSVPStatus;
  }>;
  rsvpStatus?: RSVPStatus;       // Alias for calendar/agenda components
};
```

---

## 3. Backend Integration Requirements

### 3.1 Database Changes Needed

#### EventParticipant Model Updates
```python
class EventParticipant(models.Model):
    class RSVPStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        ACCEPTED = "accepted", _("Accepted")
        DECLINED = "declined", _("Declined")
        TENTATIVE = "tentative", _("Tentative")

    # Existing fields...
    status = models.CharField(
        max_length=50,
        choices=RSVPStatus.choices,
        default=RSVPStatus.PENDING  # Changed from "none" to "pending"
    )
    responded_at = models.DateTimeField(null=True, blank=True)  # NEW FIELD
```

**Migration needed:** Add `responded_at` field and update `status` choices.

---

### 3.2 API Endpoints Needed

#### A. Update Event RSVP (NEW ENDPOINT)
```
PATCH /api/events/{event_id}/rsvp/
```

**Request:**
```json
{
  "status": "accepted" | "declined" | "tentative"
}
```

**Response:**
```json
{
  "success": true,
  "status": "accepted",
  "responded_at": "2025-11-27T10:30:00Z"
}
```

**Validation:**
- User must be an attendee of the event
- Event must exist in user's workspace
- Event must not be "unavailable" type (only INDIVIDUAL events have RSVP)
- Update EventParticipant.status and set responded_at = now()

**Permissions:**
- Only attendees can update their own RSVP (not event creator's)

---

#### B. Update Event Serializer
Modify `EventSerializer` to include RSVP data:

```python
class EventSerializer(serializers.ModelSerializer):
    # Existing fields...
    user_rsvp_status = serializers.SerializerMethodField()
    rsvp_summary = serializers.SerializerMethodField()
    attendees_with_rsvp = serializers.SerializerMethodField()

    def get_user_rsvp_status(self, obj):
        """Get current user's RSVP status for this event"""
        request = self.context.get('request')
        if not request or not request.user:
            return None

        participant = obj.eventparticipant_set.filter(user=request.user).first()
        return participant.status if participant else None

    def get_rsvp_summary(self, obj):
        """Get RSVP summary counts (only if user is event creator)"""
        request = self.context.get('request')
        if not request or obj.created_by != request.user:
            return None

        from django.db.models import Count, Q
        participants = obj.eventparticipant_set.all()

        return {
            'accepted': participants.filter(status='accepted').count(),
            'declined': participants.filter(status='declined').count(),
            'tentative': participants.filter(status='tentative').count(),
            'pending': participants.filter(status='pending').count(),
        }

    def get_attendees_with_rsvp(self, obj):
        """Get full attendee list with RSVP statuses (only if user is creator)"""
        request = self.context.get('request')
        if not request or obj.created_by != request.user:
            return None

        participants = obj.eventparticipant_set.select_related('user').all()
        return [
            {
                'name': p.user.full_name or p.user.email,
                'status': p.status,
            }
            for p in participants
        ]
```

**Important:** RSVP data should be included in:
- `GET /api/events/` (list events)
- `GET /api/events/{event_id}/` (event details)

---

### 3.3 Event Creation Updates

When creating events via Smart Schedule:
```python
# When adding attendees during event creation:
for attendee_id in attendee_ids:
    EventParticipant.objects.create(
        event=event,
        user_id=attendee_id,
        added_by=request.user,
        status='pending',  # Changed from 'invited'
    )

# Event creator should be 'accepted':
EventParticipant.objects.create(
    event=event,
    user=request.user,
    added_by=request.user,
    status='accepted',  # Creator auto-accepts
)
```

---

## 4. Frontend Integration Points

### 4.1 API Client Function (To Be Implemented)

Add to `frontend/src/lib/api.ts`:
```typescript
export async function updateEventRSVP(
  eventId: string,
  status: "accepted" | "declined" | "tentative"
): Promise<void> {
  const response = await authenticatedFetch(`/api/events/${eventId}/rsvp/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update RSVP");
  }
}
```

### 4.2 EventDetailsModal Integration

**Current Status:** Simulated RSVP update (lines 59-71)
```typescript
// TODO: Replace simulation with actual API call
const handleRsvpChange = async (status: RSVPStatus) => {
  setIsSubmitting(true);
  try {
    await updateEventRSVP(event.id, status);  // REPLACE SIMULATION
    setRsvpStatus(status);
    toast.success(`RSVP updated to ${status}`);  // Add toast notification
    // Optionally: refresh events to update calendar/agenda
  } catch (error) {
    toast.error("Failed to update RSVP");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Integration Steps:**
1. Import `updateEventRSVP` from `lib/api.ts`
2. Replace setTimeout simulation (lines 65-70) with actual API call
3. Add toast notifications using existing Sonner setup
4. Add event refresh callback to update parent component

---

## 5. UI/UX Specifications

### 5.1 EventDetailsModal - Attendee View

**RSVP Button Group:**
- 3 buttons: Accept (green), Maybe (yellow), Decline (red)
- Grid layout: `grid-cols-3 gap-2`
- Active state: Ring border + background color intensified
- Disabled during submission
- Icons: ✓ (accept), ? (tentative), ✗ (decline)

**Current Status Display:**
- Shows above buttons: "Current status: [icon] [status]"
- Color-coded by status

**Help Text:**
- Below buttons: "You can change your RSVP anytime before the event."

### 5.2 EventDetailsModal - Creator View

**RSVP Summary Box:**
- Background: `bg-zinc-50 dark:bg-zinc-800/50`
- Shows counts: "3 accepted, 2 tentative, 1 declined, 1 pending"
- Icons with color coding

**Attendee List:**
- Each attendee: name on left, status badge on right
- Status displayed with icon + capitalized text
- Color-coded by status

### 5.3 Calendar Color Coding

**Pending RSVP:**
- 4px left border: `border-l-4 border-l-amber-500`
- Indicates user needs to respond

**Declined RSVP:**
- 50% opacity: `opacity-50`
- Red tint overlay: `after:bg-red-500/10`

**Tentative RSVP:**
- Dashed border: `border-dashed border-2`
- Orange color: `border-orange-400`

**Accepted RSVP:**
- Default styling (no special indicators)

### 5.4 Agenda Component

**For Attendees:**
- Small badge next to event title
- Icon only: ⏱ (pending), ✓ (accepted), ✗ (declined), ? (tentative)
- Color-coded background

**For Creators:**
- Inline summary: "3/2/1/1" (accepted/tentative/declined/pending)
- Color-coded numbers
- Compact format for sidebar

---

## 6. User Flow

### 6.1 Attendee RSVP Flow
1. User receives event invitation (created via Smart Schedule)
2. Event appears in calendar with **amber left border** (pending status)
3. Agenda shows **⏱ pending badge** next to event
4. User clicks event → EventDetailsModal opens
5. User sees "Your RSVP" section with current status (pending)
6. User clicks Accept/Decline/Tentative button
7. Button becomes disabled, shows loading state
8. API call updates EventParticipant status
9. Success: Calendar/agenda refresh with new status styling
10. Failure: Error toast shown, status unchanged

### 6.2 Creator View Flow
1. Creator creates event, adds attendees
2. Creator sees events normally (no RSVP badges on own events)
3. Creator clicks event → EventDetailsModal opens
4. Sees "RSVP Summary" box with counts
5. Sees attendee list with individual statuses
6. Can track who has/hasn't responded

---

## 7. Testing Checklist

### Frontend Testing
- [ ] RSVP buttons appear for attendees (not creators)
- [ ] RSVP buttons disabled during submission
- [ ] Active RSVP status highlighted correctly
- [ ] Creator sees RSVP summary and attendee list
- [ ] Calendar events show correct color coding
- [ ] Agenda badges display correctly
- [ ] Dark mode styling works properly
- [ ] Mobile responsive layout works

### Backend Testing (To Be Done)
- [ ] RSVP endpoint accepts valid status changes
- [ ] RSVP endpoint rejects invalid users (not attendees)
- [ ] RSVP endpoint rejects for unavailable events
- [ ] Event serializer includes RSVP data correctly
- [ ] RSVP summary only visible to event creator
- [ ] Attendee list only visible to event creator
- [ ] New events create participants with "pending" status
- [ ] Event creator automatically set to "accepted"

### Integration Testing
- [ ] RSVP update reflects in calendar immediately
- [ ] RSVP update reflects in agenda immediately
- [ ] Creator sees updated counts after attendee responds
- [ ] Multiple attendees can RSVP independently
- [ ] User can change RSVP multiple times
- [ ] Toast notifications appear correctly

---

## 8. Future Enhancements (Not Implemented)

### 8.1 Notifications
- Email notifications when invited to event
- Email reminders for pending RSVPs
- Push notifications for RSVP updates

### 8.2 Filtering
- Filter calendar by RSVP status
- "Needs Response" filter in agenda
- Show only accepted events

### 8.3 Analytics
- RSVP response rate tracking
- Time-to-response metrics
- Attendance patterns

---

## 9. Notes for Backend Team

### Priority Actions
1. ✅ **HIGH:** Create `PATCH /api/events/{event_id}/rsvp/` endpoint
2. ✅ **HIGH:** Update EventSerializer to include RSVP fields
3. ✅ **MEDIUM:** Add `responded_at` field to EventParticipant
4. ✅ **MEDIUM:** Update event creation to use "pending"/"accepted" status
5. ⬜ **LOW:** Add database indexes on EventParticipant.status if needed

### Data Migration Considerations
- Existing EventParticipant records have `status="none"` or `status="invited"`
- Migration script should update:
  - `"invited"` → `"pending"`
  - `"accepted"` → keep as `"accepted"`
  - `"none"` → `"pending"`

### Performance Considerations
- RSVP summary calculation may need optimization for events with many attendees
- Consider caching RSVP counts on Event model if performance issues arise
- Add select_related/prefetch_related for attendee queries

### Security Considerations
- Validate user is workspace member before allowing RSVP
- Prevent RSVP spam (rate limiting)
- Ensure RSVP data only visible to event attendees + creator

---

## 10. Contact & Questions

For questions about this implementation:
- **Frontend:** Check `EventDetailsModal.tsx`, `CalendarWeek.tsx`, `Agenda.tsx`
- **Types:** See type definitions in section 2
- **Integration:** Refer to section 4

**Implementation Date:** 2025-11-27
**Frontend Status:** ✅ Complete (UI mockup, no backend integration)
**Backend Status:** ⬜ Not started
