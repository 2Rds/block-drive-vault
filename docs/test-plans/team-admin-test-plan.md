# Team Admin Dashboard - Test Plan

**Feature:** Team Admin Dashboard with Email-Based Invitations
**Date:** 2026-02-04
**Version:** 1.0.0
**Branch:** `feature/clerk-alchemy-integration`

---

## Prerequisites

Before testing, ensure:
1. [ ] User is signed in with a Clerk account
2. [ ] User is a member of at least one organization with admin role
3. [ ] Resend API key is configured in environment (`RESEND_API_KEY`)
4. [ ] Supabase edge functions are deployed
5. [ ] Test email addresses available for invitation testing

---

## Test Scenarios

### 1. Access Control

#### 1.1 Admin Access
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Sign in as org admin | Dashboard loads successfully | |
| 2 | Navigate to /teams | Teams page displays | |
| 3 | Verify "Team Admin" button visible | Button shows in nav (Shield icon) | |
| 4 | Click "Team Admin" button | Navigates to /team-admin | |
| 5 | Verify Team Admin page loads | Shows header with team name and tabs | |

#### 1.2 Non-Admin Access Denied
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Sign in as org member (non-admin) | Dashboard loads | |
| 2 | Navigate to /teams | Teams page displays | |
| 3 | Verify "Team Admin" button NOT visible | Button should not appear | |
| 4 | Manually navigate to /team-admin | Access Denied page shown OR redirected | |

#### 1.3 No Team Selected
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Sign in as user with no active org | Dashboard loads | |
| 2 | Navigate to /team-admin | "No Team Selected" message shown | |

---

### 2. Members Tab

#### 2.1 View Members
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open Team Admin > Members tab | Member table displays | |
| 2 | Verify member info displayed | Name, email, role, join method, date shown | |
| 3 | Verify current user marked "(you)" | Badge next to own name | |
| 4 | Verify owner has Crown badge | Role shows "Owner" with icon | |

#### 2.2 Change Member Role
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find a member who is NOT owner or self | Role dropdown available | |
| 2 | Click role dropdown | Options: Member, Admin | |
| 3 | Select "Admin" | Loading spinner shows | |
| 4 | Verify role updated | Toast: "Role updated to Admin" | |
| 5 | Refresh page | Role persists as Admin | |
| 6 | Change back to "Member" | Role updates successfully | |

#### 2.3 Cannot Change Own Role
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find own row in member table | Row marked "(you)" | |
| 2 | Verify role column | Role badge shown (not dropdown) | |

#### 2.4 Cannot Change Owner Role
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find owner row in member table | Row shows "Owner" badge | |
| 2 | Verify role column | Crown badge, no dropdown | |

#### 2.5 Remove Member
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find a member who is NOT owner or self | Remove button (UserMinus icon) visible | |
| 2 | Click remove button | Confirmation dialog appears | |
| 3 | Verify dialog shows member name | "Are you sure you want to remove [Name]?" | |
| 4 | Click "Cancel" | Dialog closes, member still in list | |
| 5 | Click remove again, then "Remove Member" | Loading state, then member removed | |
| 6 | Verify toast notification | "Member removed from team" | |
| 7 | Verify member gone from table | List refreshes without member | |

#### 2.6 Cannot Remove Self
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find own row in member table | Row marked "(you)" | |
| 2 | Verify no remove button | Remove button should not appear | |

---

### 3. Invitations Tab

#### 3.1 View Empty State
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open Team Admin > Invitations tab | Tab content displays | |
| 2 | If no pending invitations | Empty state with "Send First Invitation" button | |

#### 3.2 Send Invitation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Invite Member" button | Modal opens | |
| 2 | Verify modal fields | Email input, Role dropdown | |
| 3 | Enter invalid email (e.g., "notanemail") | Submit button remains disabled or shows error | |
| 4 | Enter valid email (test@example.com) | Email accepted | |
| 5 | Select role "Admin" | Dropdown updates | |
| 6 | Click "Send Invitation" | Loading state shows | |
| 7 | Verify success | Toast: "Invitation sent to test@example.com" | |
| 8 | Verify modal closes | Modal dismissed | |
| 9 | Verify invitation in pending list | New row appears with email, role, sent date | |

#### 3.3 Duplicate Invitation Prevention
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Try to invite same email again | Modal opens | |
| 2 | Enter previously invited email | Form accepts input | |
| 3 | Click "Send Invitation" | Error: "An invitation is already pending" | |

#### 3.4 Existing Member Prevention
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Try to invite existing member's email | Modal opens | |
| 2 | Enter team member's email | Form accepts input | |
| 3 | Click "Send Invitation" | Error: "This email is already a team member" | |

#### 3.5 Resend Invitation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find pending invitation in list | Row visible with resend button | |
| 2 | Click resend button (RefreshCw icon) | Loading spinner | |
| 3 | Verify success | Toast: "Invitation resent" | |
| 4 | Verify expiry updated | Expiry time reset to 7 days | |

#### 3.6 Revoke Invitation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find pending invitation in list | Row visible with revoke button | |
| 2 | Click revoke button (X icon) | Loading spinner | |
| 3 | Verify success | Toast: "Invitation revoked" | |
| 4 | Verify invitation removed from list | Row no longer appears | |

#### 3.7 Expired Invitation Display
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | If expired invitation exists | Row shows "Expired" badge | |
| 2 | Verify row styling | Row should be visually muted | |

---

### 4. Email Domains Tab

#### 4.1 View Empty State
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open Team Admin > Domains tab | Tab content displays | |
| 2 | If no domains configured | Empty state with "Add First Domain" button | |
| 3 | Verify info box | Blue box explaining how auto-join works | |

#### 4.2 Add Email Domain
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Add Domain" button | Modal opens | |
| 2 | Verify modal fields | Domain input, Auto-join toggle, Default role | |
| 3 | Enter invalid domain (e.g., "invalid") | Error shown on submit | |
| 4 | Enter valid domain (e.g., "testcompany.com") | Domain accepted | |
| 5 | Toggle auto-join OFF | Toggle updates | |
| 6 | Select default role "Admin" | Dropdown updates | |
| 7 | Click "Add Domain" | Loading state | |
| 8 | Verify success | Toast: "Email domain added" | |
| 9 | Verify domain in list | New row: @testcompany.com, Pending status | |

#### 4.3 Domain Table Display
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View domain table | Columns: Domain, Status, Auto-Join, Default Role | |
| 2 | Verify domain shows @ prefix | "@company.com" format | |
| 3 | Verify status badge | "Verified" (green) or "Pending" (gray) | |
| 4 | Verify auto-join indicator | "Enabled" (green) or "Disabled" (gray) | |
| 5 | Verify role badge | Shows Member or Admin with icon | |

---

### 5. Email Notifications

#### 5.1 Team Invitation Email
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Send invitation to real email | Email should be delivered | |
| 2 | Verify email subject | "You're invited to join [TeamName] on BlockDrive" | |
| 3 | Verify email content | Team name, inviter name, role, join button | |
| 4 | Verify join link works | Link leads to join flow | |

#### 5.2 Payment Confirmation Email (if Stripe configured)
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete a test payment | Stripe webhook triggered | |
| 2 | Check email inbox | Payment confirmation received | |
| 3 | Verify email shows amount and plan | "$X.XX", "Pro Plan" etc. | |
| 4 | Verify "View Invoice" link works | Links to Stripe invoice | |

#### 5.3 Payment Failed Email (if Stripe configured)
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Trigger failed payment (test card) | Stripe webhook triggered | |
| 2 | Check email inbox | Payment failed notification received | |
| 3 | Verify email shows plan | Current subscription tier | |
| 4 | Verify "Update Payment" link works | Links to membership page | |

---

### 6. Navigation & UI

#### 6.1 Responsive Design
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View Team Admin on desktop | Full layout with visible text | |
| 2 | Resize to tablet width | Layout adjusts, tabs may hide text | |
| 3 | Resize to mobile width | Tabs show icons only, tables scroll | |

#### 6.2 Loading States
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to Team Admin | Loading skeleton shown briefly | |
| 2 | Verify skeleton matches layout | Header + tabs + content skeleton | |

#### 6.3 Back Navigation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click back arrow in header | Navigates to /teams | |

---

## Edge Cases

| Scenario | Expected Behavior | Pass/Fail |
|----------|-------------------|-----------|
| Network error during invitation | Error toast, form remains open | |
| Very long email address | Truncated in table, full in tooltip | |
| Special characters in team name | Displays correctly in emails | |
| Concurrent role changes | Last write wins, no corruption | |
| Session expires during action | Redirect to login | |

---

## Sign-Off

| Tester | Date | Result | Notes |
|--------|------|--------|-------|
| | | | |

---

## Notes

- All tests should be run in both development and staging environments
- Email tests require valid Resend API configuration
- Payment email tests require Stripe test mode with webhook forwarding
- Consider testing with multiple browsers (Chrome, Firefox, Safari)
