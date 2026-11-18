# Meetrix --- Enterprise Meeting & Collaboration Platform

## Product Requirements Document (PRD)

**Document status:** Draft\
**Version:** 1.0\
**Date:** 12 November 2026\
**Product type:** Multi-tenant enterprise web application\
**Primary platforms:** Web application; responsive mobile web. Native
mobile is out of scope for the initial release.\
**Working product name:** Meetrix

------------------------------------------------------------------------

## 1. Executive Summary

Meetrix is an enterprise meeting and collaboration platform that enables
organizations to plan, conduct, document, and follow up on internal and
external meetings. It combines scheduled meetings, real-time audio/video
communication using WebRTC, participant and attendance management,
collaborative meeting notes, recordings, searchable transcripts, and
AI-generated meeting outcomes.

The product is designed to make meetings accountable and searchable. A
meeting should not end with an unstructured recording or notes that are
difficult to find. Each meeting should produce an organized record
containing its agenda, participants, attendance, minutes, decisions,
action items, supporting files, transcript, and AI-generated summary.

Meetrix will be built on the existing `merb-starterpack` repository. The
existing authentication, RBAC foundation, monorepo, queue
infrastructure, frontend framework, containerization, and deployment
automation should be reused wherever practical.

### 1.1 Product Vision

Make every enterprise meeting easier to run, easier to understand, and
easier to turn into accountable work.

### 1.2 Product Principles

1.  **Meeting-first workflow:** scheduling, joining, conducting,
    documenting, and following up belong to one coherent workflow.
2.  **Human-controlled AI:** AI output is a draft or recommendation.
    Authorized users review and approve official minutes and action
    items.
3.  **Privacy by design:** recording, transcription, AI processing,
    retention, and access must be explicit and configurable.
4.  **Enterprise governance:** tenant isolation, role-based access,
    auditability, retention policies, and administrative controls are
    core requirements.
5.  **Reliable real-time communication:** the meeting experience must
    remain usable under imperfect network conditions.
6.  **Incremental architecture:** preserve the starterpack's modular
    monolith and worker model initially; extract services only when
    scale or operational requirements justify it.

------------------------------------------------------------------------

## 2. Goals and Success Metrics

### 2.1 Business Goals

-   Reduce the time required to prepare meeting minutes and distribute
    outcomes.
-   Improve visibility into meeting decisions, responsibilities, and
    deadlines.
-   Provide a centralized and searchable record of organizational
    meetings.
-   Support secure internal meetings and invited external participants.
-   Give administrators control over meeting policies, data retention,
    and access.
-   Provide a foundation for future integrations with calendars,
    identity providers, project management tools, and enterprise
    systems.

### 2.2 Product Goals

-   Users can schedule, join, and host meetings from the web
    application.
-   Participants can communicate through real-time audio and video.
-   Hosts can manage participants, permissions, and meeting controls.
-   Authorized users can record meetings and generate transcripts when
    consent and policy requirements are satisfied.
-   AI can generate summaries, decisions, topics, and proposed action
    items from meeting content.
-   Users can edit, approve, publish, and search official meeting
    records.
-   Administrators can manage organizations, members, roles, policies,
    and audit logs.

### 2.3 Success Metrics

  -----------------------------------------------------------------------
  Metric                                                   Initial target
  ------------------------------ ----------------------------------------
  Successful meeting joins                  At least 98% of join attempts

  Meeting service availability           99.5% monthly target for initial
                                                               production

  Meeting record completion       At least 85% of completed meetings have
                                                     minutes or a summary

  AI summary generation              95% of eligible recordings processed
                                                             successfully

  AI summary turnaround              Within 5 minutes after processing is
                                  queued for a typical 60-minute meeting;
                                          provider and workload dependent

  Action item review             At least 70% of AI-proposed action items
                                                     reviewed or resolved

  API reliability                 Less than 1% server-side error rate for
                                                           core workflows

  Search response                  p95 under 2 seconds for normal indexed
                                                                  queries

  Authorization                       Zero known cross-tenant data access
                                                                incidents
  -----------------------------------------------------------------------

Targets are provisional and must be validated through load testing and
pilot usage.

------------------------------------------------------------------------

## 3. Scope

### 3.1 In Scope

-   Multi-tenant organization and workspace management.
-   User invitations, memberships, profiles, and RBAC.
-   Meeting scheduling and lifecycle management.
-   Meeting links and guest access.
-   WebRTC audio/video meetings.
-   Waiting room, participant controls, and host/moderator controls.
-   Participant list and attendance records.
-   Screen sharing, chat, reactions, and basic meeting interaction.
-   Agenda and collaborative notes.
-   Meeting files and attachments.
-   Recording and playback.
-   Speech-to-text transcription.
-   AI meeting summaries, decisions, topics, and suggested action items.
-   Human review and approval of meeting minutes.
-   Search, filters, and meeting history.
-   Notifications and reminders.
-   Audit logs, retention settings, and organization policies.
-   Administrative dashboards and operational monitoring.

### 3.2 Out of Scope for Initial Release

-   Native iOS and Android applications.
-   PSTN dial-in and outbound telephone calling.
-   Webinar broadcasting to thousands of passive viewers.
-   Full project management functionality.
-   Full document editing comparable to Google Docs.
-   AI-generated voice cloning or synthetic participant voices.
-   Automatic approval of official minutes without human review.
-   Automatic employee performance scoring based on meeting speech.
-   End-to-end encrypted group media if it conflicts with server-side
    recording and transcription requirements. This requires a separate
    security and product decision.
-   Complex on-premises deployment for every customer. The architecture
    should not prevent it, but it is not an initial delivery
    requirement.

------------------------------------------------------------------------

## 4. Users, Roles, and Permissions

Meetrix is a multi-tenant application. An organization is a tenant
boundary. A user may belong to more than one organization, with a
separate membership and role in each organization.

### 4.1 Core Roles

  -----------------------------------------------------------------------
  Role                                Description
  ----------------------------------- -----------------------------------
  Platform Super Admin                Operates the Meetrix platform and
                                      manages tenant-level platform
                                      support functions

  Organization Owner                  Owns organization configuration,
                                      subscription-level settings, and
                                      organization administrators

  Organization Admin                  Manages members, roles, policies,
                                      organization settings, and audit
                                      access

  Meeting Admin                       Can manage organization meetings
                                      and meeting templates, subject to
                                      policy

  Meeting Host                        Creates and controls meetings,
                                      manages participants, and publishes
                                      meeting records

  Co-host / Moderator                 Helps manage an active meeting with
                                      delegated permissions

  Member                              Schedules and joins meetings,
                                      participates, and accesses records
                                      permitted to them

  Guest                               Joins a specific meeting through an
                                      invitation or secure link with
                                      limited access
  -----------------------------------------------------------------------

### 4.2 Authorization Principles

-   RBAC permissions use the starterpack's `resource:action` convention.
-   Tenant context must be resolved and validated for every
    organization-scoped request.
-   A role name alone must never be treated as sufficient authorization;
    permissions and resource ownership must be checked.
-   Meeting-level permissions can further restrict access beyond
    organization permissions.
-   Guests must not gain organization membership merely by joining a
    meeting.
-   The platform super admin must not automatically have unrestricted
    access to customer meeting content. Support access should be
    controlled, justified, time-limited, and audited.
-   Backend authorization is authoritative. Hiding frontend controls is
    not a security boundary.

### 4.3 Suggested Permission Catalogue

Examples (the final catalogue should be reviewed during implementation):

-   `organizations:read`, `organizations:manage`
-   `members:read`, `members:invite`, `members:manage`, `members:remove`
-   `roles:read`, `roles:manage`
-   `meetings:create`, `meetings:read`, `meetings:update`,
    `meetings:cancel`, `meetings:delete`
-   `meetings:manage_all`
-   `meeting_participants:invite`, `meeting_participants:manage`
-   `meeting_host:control`
-   `meeting_recordings:read`, `meeting_recordings:manage`
-   `meeting_transcripts:read`, `meeting_transcripts:manage`
-   `meeting_minutes:read`, `meeting_minutes:write`,
    `meeting_minutes:approve`, `meeting_minutes:publish`
-   `meeting_files:read`, `meeting_files:upload`, `meeting_files:delete`
-   `meeting_ai:use`, `meeting_ai:manage`
-   `audit_logs:read`
-   `meeting_policies:read`, `meeting_policies:manage`

------------------------------------------------------------------------

## 5. Functional Requirements

Priority definitions: - **P0 --- Release blocker:** required for the
first usable production release. - **P1 --- High:** important for
enterprise adoption; may follow the first release. - **P2 --- Later:**
valuable enhancement.

### 5.1 Authentication and Organization Management

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  AUTH-001                Users can register or   P0
                          accept an invitation    
                          and authenticate using  
                          the existing JWT        
                          access/refresh-token    
                          flow.                   

  AUTH-002                Users can log in, log   P0
                          out, refresh sessions,  
                          and view their active   
                          profile.                

  AUTH-003                Users can belong to     P0
                          multiple organizations  
                          with independent        
                          memberships.            

  ORG-001                 An organization         P0
                          owner/admin can update  
                          organization name,      
                          logo, timezone, and     
                          basic settings.         

  ORG-002                 Admins can invite users P0
                          by email and assign an  
                          organization role.      

  ORG-003                 Admins can deactivate   P0
                          or remove members,      
                          subject to ownership    
                          safeguards.             

  ORG-004                 Admins can view         P0
                          organization members    
                          and invitation status.  

  ORG-005                 Organization data must  P0
                          be isolated from other  
                          tenants.                

  ORG-006                 Support configurable    P1
                          SSO using OIDC/SAML in  
                          a later enterprise      
                          phase.                  
  -----------------------------------------------------------------------

### 5.2 Meeting Scheduling and Management

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  MTG-001                 Authorized users can    P0
                          create a meeting with   
                          title, description,     
                          start/end time,         
                          timezone, and           
                          visibility.             

  MTG-002                 A meeting can be        P0
                          scheduled or started    
                          immediately.            

  MTG-003                 A meeting can have      P0
                          internal members and    
                          external guest          
                          invitees.               

  MTG-004                 The creator can assign  P0
                          a host and optional     
                          co-hosts.               

  MTG-005                 A meeting can have an   P0
                          agenda containing       
                          ordered items and       
                          descriptions.           

  MTG-006                 Users can edit,         P0
                          reschedule, cancel, or  
                          duplicate meetings      
                          subject to permissions. 

  MTG-007                 Users can view          P0
                          upcoming, past, and     
                          cancelled meetings.     

  MTG-008                 The system generates a  P0
                          unique meeting join URL 
                          and access credentials. 

  MTG-009                 Hosts can configure a   P0
                          waiting room, guest     
                          access, passcode, and   
                          participant             
                          permissions.            

  MTG-010                 Users can create        P1
                          recurring meetings with 
                          recurrence rules and    
                          exceptions.             

  MTG-011                 Organizations can       P1
                          define reusable meeting 
                          templates and default   
                          settings.               

  MTG-012                 Users can attach        P1
                          reference files and     
                          meeting materials       
                          before the meeting.     

  MTG-013                 Meetings can be tagged  P1
                          by department, project, 
                          category, or custom     
                          labels.                 

  MTG-014                 Hosts can configure     P0
                          recording and AI        
                          processing policies     
                          before the meeting.     
  -----------------------------------------------------------------------

**Meeting lifecycle:**
`draft → scheduled → live → ended → processing → completed`. A meeting
may also be `cancelled`. Processing failures must be represented
explicitly and must not erase the meeting or its recording metadata.

### 5.3 Real-Time WebRTC Meeting Room

The meeting room is the primary real-time experience. It must support
audio/video communication and recover gracefully from network changes.

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  RTC-001                 Participants can join a P0
                          meeting using a valid   
                          authenticated           
                          membership or guest     
                          invitation.             

  RTC-002                 The browser requests    P0
                          camera and microphone   
                          permission only when    
                          required.               

  RTC-003                 Participants can        P0
                          mute/unmute their       
                          microphone.             

  RTC-004                 Participants can        P0
                          enable/disable their    
                          camera.                 

  RTC-005                 Participants can select P0
                          available camera,       
                          microphone, and speaker 
                          devices.                

  RTC-006                 Participants can share  P0
                          their screen or a       
                          selected window/tab     
                          where browser support   
                          allows.                 

  RTC-007                 The meeting room        P0
                          displays participant    
                          video tiles and an      
                          audio-only participant  
                          state.                  

  RTC-008                 The room provides       P0
                          active-speaker          
                          indication.             

  RTC-009                 Participants can send   P0
                          meeting chat messages.  

  RTC-010                 Participants can use    P1
                          basic reactions or      
                          hand-raise.             

  RTC-011                 Hosts can mute          P0
                          participants, remove    
                          participants, lock the  
                          room, and control the   
                          waiting room.           

  RTC-012                 Co-host permissions can P1
                          be delegated by the     
                          host.                   

  RTC-013                 Participants can        P0
                          reconnect after         
                          temporary network loss  
                          without creating        
                          duplicate attendance    
                          records.                

  RTC-014                 The interface displays  P1
                          connection quality and  
                          actionable              
                          device/network errors.  

  RTC-015                 Participants can leave  P0
                          without ending the      
                          meeting for everyone.   

  RTC-016                 Only authorized hosts   P0
                          can end the meeting for 
                          all participants.       

  RTC-017                 The room supports a     P0
                          configurable            
                          participant limit based 
                          on deployment capacity  
                          and plan.               

  RTC-018                 A participant can       P2
                          report a technical      
                          issue without leaving   
                          the meeting.            
  -----------------------------------------------------------------------

**WebRTC implementation direction**

-   Use LiveKit as the SFU/media layer. The browser connects to LiveKit
    using short-lived room tokens generated by the backend.
-   The backend remains responsible for application authorization,
    meeting state, participant eligibility, and token issuance.
-   Use a TURN service (for example, coturn or the TURN capability
    supported by the chosen LiveKit deployment) to improve connectivity
    behind restrictive NATs and firewalls.
-   Do not expose LiveKit API secrets or signing credentials to the
    browser.
-   Use LiveKit webhooks or server-side events to reconcile room and
    participant lifecycle events with application records.
-   Use LiveKit Egress or an equivalent supported recording pipeline for
    server-side recording. Validate recording topology and scaling
    before production.
-   The application must distinguish application presence from media
    connection state. A user can be authorized for a meeting without
    currently publishing audio/video.

### 5.4 Participant and Attendance Management

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  ATT-001                 A meeting has an        P0
                          invitee list with       
                          invitation status.      

  ATT-002                 The system records join P0
                          and leave timestamps    
                          for each participant    
                          session.                

  ATT-003                 The system calculates   P0
                          attendance duration     
                          from valid session      
                          intervals.              

  ATT-004                 Reconnection creates or P0
                          updates session         
                          segments without        
                          duplicating the         
                          participant identity.   

  ATT-005                 Hosts can view invited, P0
                          accepted, declined,     
                          waiting, present, and   
                          absent states where     
                          applicable.             

  ATT-006                 Hosts can export an     P1
                          attendance report.      

  ATT-007                 Attendance records      P0
                          distinguish internal    
                          members from guests.    

  ATT-008                 Authorized hosts can    P1
                          make a documented       
                          attendance correction   
                          with an audit entry.    

  ATT-009                 Organizations can       P2
                          configure attendance    
                          rules, such as a        
                          minimum duration        
                          threshold.              
  -----------------------------------------------------------------------

Attendance is an operational record, not an automatic proof of identity.
The product must not claim that a connected participant is necessarily
the person named in an invitation.

### 5.5 Agenda, Notes, and Minutes of Meeting

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  MIN-001                 A meeting can have an   P0
                          agenda created before   
                          the meeting.            

  MIN-002                 Authorized participants P0
                          can create and edit     
                          meeting notes during    
                          the meeting.            

  MIN-003                 Notes can be associated P1
                          with agenda items.      

  MIN-004                 Notes can include       P0
                          headings, lists, links, 
                          and basic rich text.    

  MIN-005                 Users can create a      P0
                          formal Minutes of       
                          Meeting (MoM) document  
                          after the meeting.      

  MIN-006                 MoM includes meeting    P0
                          metadata, attendees,    
                          agenda, discussion      
                          notes, decisions, and   
                          action items.           

  MIN-007                 Users can edit          P0
                          AI-generated or         
                          manually written        
                          minutes before          
                          publication.            

  MIN-008                 Authorized users can    P0
                          approve and publish     
                          minutes.                

  MIN-009                 Published minutes have  P1
                          a revision history and  
                          publication metadata.   

  MIN-010                 Users can export        P1
                          minutes to PDF and      
                          Markdown.               

  MIN-011                 Hosts can request       P2
                          comments or corrections 
                          on draft minutes.       

  MIN-012                 Minutes visibility      P0
                          follows meeting and     
                          organization access     
                          policies.               
  -----------------------------------------------------------------------

**MoM status:** `draft → review → approved → published`. Revisions to
published minutes must create a new version or an auditable revision;
they must not silently overwrite the historical record.

### 5.6 Decisions and Action Items

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  ACT-001                 Users can create an     P0
                          action item linked to a 
                          meeting.                

  ACT-002                 An action item has      P0
                          title, description,     
                          owner, due date,        
                          priority, and status.   

  ACT-003                 Action item status      P0
                          supports `open`,        
                          `in_progress`,          
                          `blocked`, `completed`, 
                          and `cancelled`.        

  ACT-004                 Users can record        P0
                          decisions separately    
                          from general notes.     

  ACT-005                 Each decision can       P1
                          include context,        
                          decision text, and the  
                          responsible approver    
                          where applicable.       

  ACT-006                 AI can propose action   P0
                          items and owners from   
                          transcript content, but 
                          a user must confirm     
                          them.                   

  ACT-007                 Users can view action   P1
                          items across meetings,  
                          filtered by owner, due  
                          date, status, and       
                          project/tag.            

  ACT-008                 The system sends        P1
                          reminders for assigned  
                          action items.           

  ACT-009                 Changes to action item  P1
                          ownership, due date,    
                          and status are          
                          auditable.              
  -----------------------------------------------------------------------

AI must not assign an action item to a person solely because their name
was mentioned. If ownership is uncertain, the proposal must remain
unassigned and be flagged for review.

### 5.7 Recording and Media Library

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  REC-001                 An authorized host can  P0
                          start or stop a meeting 
                          recording when          
                          organization policy     
                          allows it.              

  REC-002                 Participants receive a  P0
                          clear visual indication 
                          while recording is      
                          active.                 

  REC-003                 The system records      P0
                          consent or              
                          acknowledgement         
                          according to the        
                          organization's          
                          configured policy and   
                          applicable law.         

  REC-004                 Recording metadata      P0
                          includes meeting ID,    
                          start/end time, status, 
                          duration, and storage   
                          reference.              

  REC-005                 Authorized users can    P0
                          play, pause, seek, and  
                          view recording details. 

  REC-006                 Recording access is     P0
                          checked on every        
                          playback request.       

  REC-007                 Recordings can be       P1
                          downloaded only when    
                          policy and permission   
                          allow it.               

  REC-008                 Organization            P0
                          administrators can      
                          configure retention     
                          periods and deletion    
                          behavior.               

  REC-009                 Failed recording jobs   P0
                          can be retried safely   
                          and surfaced to         
                          administrators.         

  REC-010                 The system supports     P0
                          deletion requests and   
                          records the outcome in  
                          an audit log.           
  -----------------------------------------------------------------------

Recordings should be stored in private object storage (S3-compatible
storage or equivalent), not directly in MongoDB. Use short-lived signed
playback/download URLs after authorization. Never expose a permanent
public object URL.

### 5.8 Transcription

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  TRN-001                 Eligible recordings can P0
                          be submitted to a       
                          speech-to-text          
                          provider.               

  TRN-002                 The system stores       P0
                          transcript segments     
                          with timestamps and     
                          speaker labels where    
                          supported.              

  TRN-003                 Users can view a        P0
                          transcript alongside    
                          the recording.          

  TRN-004                 Selecting a transcript  P1
                          segment seeks the       
                          recording to the        
                          corresponding time.     

  TRN-005                 Authorized users can    P1
                          correct transcript text 
                          and speaker labels.     

  TRN-006                 The system records      P0
                          transcription provider, 
                          model, language,        
                          processing status, and  
                          errors.                 

  TRN-007                 Users can search        P1
                          transcript text when    
                          permitted.              

  TRN-008                 The system supports     P1
                          language selection or   
                          language detection      
                          where supported by the  
                          chosen provider.        
  -----------------------------------------------------------------------

Speaker labels are estimates and may be incorrect. The UI must not
present diarization as verified identity. Transcript language and
accuracy depend on audio quality and provider capabilities.

### 5.9 AI Meeting Intelligence

AI features must be implemented through a provider abstraction so that
the product is not locked to one model vendor.

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  AI-001                  Generate a concise      P0
                          executive summary from  
                          an eligible transcript. 

  AI-002                  Generate a detailed     P0
                          summary organized by    
                          agenda item or topic.   

  AI-003                  Extract key discussion  P0
                          points and topics.      

  AI-004                  Propose decisions made  P0
                          during the meeting.     

  AI-005                  Propose action items,   P0
                          owners, and due dates   
                          when supported by       
                          explicit evidence.      

  AI-006                  Highlight unresolved    P1
                          questions, risks, and   
                          follow-up topics.       

  AI-007                  Generate a draft MoM    P0
                          using meeting metadata, 
                          agenda, notes, and      
                          transcript.             

  AI-008                  Allow authorized users  P1
                          to regenerate a summary 
                          with a selected style   
                          or length.              

  AI-009                  Preserve links from     P1
                          generated claims to     
                          supporting transcript   
                          segments when           
                          available.              

  AI-010                  Allow a user to mark an P0
                          AI result as incorrect  
                          and edit it.            

  AI-011                  Show processing status, P0
                          provider errors, and    
                          retry state.            

  AI-012                  Do not use meeting      P0
                          content to train a      
                          provider model unless   
                          the organization has    
                          explicitly enabled and  
                          approved that           
                          processing arrangement. 

  AI-013                  Support configurable AI P0
                          enablement by           
                          organization and        
                          meeting.                

  AI-014                  Keep a record of        P1
                          model/provider,         
                          prompt/template         
                          version, processing     
                          time, and output        
                          version.                
  -----------------------------------------------------------------------

**AI output structure**

A completed AI meeting report should contain:

1.  Executive summary.
2.  Meeting purpose and context.
3.  Main topics discussed.
4.  Summary per agenda item.
5.  Decisions and rationale.
6.  Action items with proposed owners and due dates.
7.  Risks, blockers, and unresolved questions.
8.  Follow-up topics.
9.  Source references to transcript timestamps where supported.
10. Confidence or review flags for uncertain extractions.

**AI safety and quality rules**

-   Treat transcript content as untrusted input. It may contain
    instructions directed at the AI; those instructions must not
    override system policy or trigger external actions.
-   Do not invent decisions, commitments, dates, or owners.
-   Clearly distinguish transcript-grounded facts from model inference.
-   If evidence is missing, return `unknown`, `not specified`, or a
    review flag rather than guessing.
-   AI output is always a draft until an authorized user approves it.
-   Never send invitations, assign tasks in external systems, or publish
    official minutes solely because an AI model suggested it.
-   Restrict AI context to the meeting and records the requesting user
    is authorized to access.
-   Apply provider timeouts, rate limits, retry limits, and cost
    controls.

### 5.10 Search and Meeting History

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  SRC-001                 Users can search        P0
                          meetings by title and   
                          description.            

  SRC-002                 Users can filter by     P0
                          date range, host,       
                          participant, status,    
                          and tag.                

  SRC-003                 Authorized users can    P1
                          search minutes and      
                          action items.           

  SRC-004                 Authorized users can    P1
                          search transcript       
                          content.                

  SRC-005                 Search results enforce  P0
                          tenant and              
                          meeting-level           
                          authorization.          

  SRC-006                 Users can open a        P0
                          meeting detail page     
                          containing all          
                          accessible meeting      
                          artifacts.              
  -----------------------------------------------------------------------

### 5.11 Notifications

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  NOT-001                 Send meeting invitation P0
                          emails.                 

  NOT-002                 Send meeting update and P0
                          cancellation emails.    

  NOT-003                 Send configurable       P1
                          reminders before        
                          meetings.               

  NOT-004                 Notify users when       P1
                          minutes are published   
                          or they are assigned an 
                          action item.            

  NOT-005                 Notify action item      P1
                          owners about            
                          approaching or overdue  
                          deadlines.              

  NOT-006                 Provide an in-app       P1
                          notification center.    

  NOT-007                 Users can configure     P2
                          non-essential           
                          notification            
                          preferences.            
  -----------------------------------------------------------------------

Reuse the existing BullMQ email queue and worker. Notifications must be
idempotent to avoid duplicate messages when jobs are retried.

### 5.12 Administration and Governance

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  ADM-001                 Organization admins can P0
                          manage members and      
                          roles.                  

  ADM-002                 Organization admins can P0
                          configure meeting       
                          defaults and guest      
                          access policy.          

  ADM-003                 Organization admins can P0
                          configure recording,    
                          AI, and retention       
                          policies.               

  ADM-004                 Authorized              P0
                          administrators can view 
                          audit events.           

  ADM-005                 Admins can view meeting P1
                          usage and storage       
                          consumption.            

  ADM-006                 Admins can configure    P1
                          allowed external guest  
                          domains.                

  ADM-007                 Platform operators can  P0
                          monitor system health   
                          without unrestricted    
                          access to meeting       
                          content.                

  ADM-008                 Support access to       P1
                          tenant data is          
                          time-bound,             
                          reason-coded, and       
                          audited.                
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 6. Main User Journeys

### 6.1 Schedule and Prepare a Meeting

1.  A member opens the meeting calendar or meeting dashboard.
2.  The member selects **Create Meeting**.
3.  The member enters title, description, date, time, timezone, and
    duration.
4.  The member adds internal participants and external guest email
    addresses.
5.  The member assigns a host and optional co-hosts.
6.  The member creates an agenda and attaches reference documents.
7.  The member configures the waiting room, guest access, recording, and
    AI settings within organization policy.
8.  The system creates the meeting and sends invitations.
9.  Invitees receive a meeting link and can view meeting details
    according to their access.

**Acceptance criteria** - The meeting cannot be created with an invalid
time range. - Timezone is stored or normalized consistently and
displayed in the viewer's timezone. - Unauthorized users cannot invite
participants outside policy. - Invitation retries do not produce
uncontrolled duplicate invitations.

### 6.2 Join and Conduct a Meeting

1.  A participant opens the meeting link.
2.  The application validates the invitation or authenticated
    membership.
3.  The participant sees a pre-join screen to test microphone, camera,
    and speaker.
4.  The participant joins the waiting room or meeting, depending on
    policy.
5.  The host admits the participant if required.
6.  The participant joins the LiveKit room using a short-lived token.
7.  Participants use microphone, camera, screen share, chat, and
    reactions.
8.  The host manages participants and meeting controls.
9.  The application records attendance events and relevant meeting
    state.
10. The host ends the meeting or leaves it running for other
    participants.

**Acceptance criteria** - An unauthorized user cannot obtain a room
token. - Expired or revoked invitations cannot be used to join. - A
network reconnect does not create duplicate logical participants. - Only
an authorized host can end the meeting for everyone. - Recording state
is visible to all participants while active.

### 6.3 Generate and Approve Meeting Minutes

1.  The meeting ends.
2.  The system finalizes recording metadata and queues eligible
    processing jobs.
3.  A worker submits audio to the transcription provider.
4.  The transcription result is stored with timestamps and speaker
    labels where available.
5.  The AI worker generates a summary, decisions, and proposed action
    items.
6.  The meeting host receives a notification that the draft is ready.
7.  The host reviews and edits the generated MoM.
8.  The host assigns or corrects action item owners and due dates.
9.  An authorized user approves and publishes the minutes.
10. Participants with access receive a notification and can view the
    published record.

**Acceptance criteria** - Processing is asynchronous and does not block
the meeting lifecycle API. - A failed AI job does not delete or corrupt
the recording or transcript. - The host can publish manually written
minutes if AI processing fails. - AI-generated action items remain
proposals until confirmed. - Published minutes preserve their version
history.

### 6.4 Follow Up on Action Items

1.  A user opens **My Action Items**.
2.  The user filters open, overdue, or completed tasks.
3.  The user opens an action item and sees its source meeting and
    decision context.
4.  The user updates status or adds a progress note.
5.  The system records the change and notifies relevant users where
    configured.
6.  The meeting record reflects the latest action item status.

------------------------------------------------------------------------

## 7. Information Architecture and Main Screens

### 7.1 Application Navigation

-   Dashboard
-   Meetings
    -   Upcoming
    -   Past
    -   My Meetings
    -   Create Meeting
-   Calendar
-   My Action Items
-   Meeting Library / Search
-   Recordings (permission-controlled)
-   Notifications
-   Organization
    -   Members
    -   Roles & Permissions
    -   Meeting Policies
    -   AI & Recording Settings
    -   Audit Logs
    -   Usage & Storage
-   Profile & Preferences

### 7.2 Required Screens

  -----------------------------------------------------------------------
  Screen                              Key contents
  ----------------------------------- -----------------------------------
  Login / Invitation Acceptance       Authentication, organization
                                      context

  Dashboard                           Upcoming meetings, recent meetings,
                                      pending action items, quick actions

  Meeting List                        Search, filters, statuses, create
                                      action

  Calendar                            Day/week/month views, meeting
                                      details

  Create/Edit Meeting                 Details, invitees, host, agenda,
                                      access and AI/recording policies

  Meeting Detail                      Overview, agenda, invitees, files,
                                      notes, recording and minutes status

  Pre-Join                            Device selection, camera preview,
                                      microphone test, display name

  Live Meeting Room                   Video grid, controls, participants,
                                      chat, notes, screen share

  Post-Meeting Workspace              Recording, transcript, AI summary,
                                      decisions, action items, MoM

  Minutes Editor                      Structured editing, review,
                                      approval, publication

  My Action Items                     Assigned tasks, due dates, status,
                                      source meeting

  Search                              Searchable meetings and permitted
                                      meeting artifacts

  Organization Settings               Members, roles, policies,
                                      retention, AI and recording
                                      settings

  Audit Logs                          Filterable events with actor,
                                      target, time, and outcome
  -----------------------------------------------------------------------

### 7.3 Live Meeting Room Layout

Recommended desktop layout:

-   **Main area:** speaker-focused or gallery video layout.
-   **Top bar:** meeting title, elapsed time, recording indicator,
    connection status.
-   **Bottom control bar:** microphone, camera, screen share, reactions,
    chat, participants, leave/end.
-   **Side panel:** tabs for participants, chat, agenda, and notes.
-   **Host controls:** waiting room, mute controls, remove participant,
    lock meeting, recording controls.

On smaller screens, the layout should prioritize active speaker/video
and expose secondary panels through accessible drawers or tabs.

------------------------------------------------------------------------

## 8. Data Model

MongoDB is the primary application database. The following is a logical
model; exact schemas, indexes, and embedding decisions should be
finalized during technical design.

### 8.1 Core Collections

  -----------------------------------------------------------------------
  Collection              Purpose                 Important fields
  ----------------------- ----------------------- -----------------------
  `users`                 Global user identity    email, name, avatar,
                                                  status

  `organizations`         Tenant records          name, slug, timezone,
                                                  settings

  `memberships`           User-to-organization    organizationId, userId,
                          relationship            roleId, status

  `roles`                 Role definitions        organizationId, name,
                                                  permissions, isSystem

  `invitations`           Organization            organizationId, email,
                          invitations             roleId, tokenHash,
                                                  expiresAt, status

  `meetings`              Meeting metadata and    organizationId, title,
                          lifecycle               description, startAt,
                                                  endAt, timezone,
                                                  status, hostId,
                                                  settings

  `meetingParticipants`   Invitees and            meetingId, userId,
                          participant access      guestEmail, role,
                                                  invitationStatus

  `meetingSessions`       Participant connection  meetingId,
                          sessions                participantId,
                                                  joinedAt, leftAt,
                                                  connectionMetadata

  `meetingAgendaItems`    Ordered agenda          meetingId, title,
                                                  description, position,
                                                  status

  `meetingNotes`          Notes and revisions     meetingId, authorId,
                                                  agendaItemId, content,
                                                  version

  `meetingChatMessages`   Meeting chat            meetingId, senderId,
                                                  body, createdAt

  `meetingFiles`          File metadata           meetingId, uploaderId,
                                                  objectKey, mimeType,
                                                  size

  `recordings`            Recording metadata      meetingId, provider,
                                                  objectKey, status,
                                                  duration,
                                                  retentionUntil

  `transcripts`           Transcript metadata     meetingId, language,
                                                  provider, status,
                                                  version

  `transcriptSegments`    Timestamped transcript  transcriptId, startMs,
                          chunks                  endMs, speakerLabel,
                                                  text

  `meetingSummaries`      AI output versions      meetingId, provider,
                                                  model, promptVersion,
                                                  status, content

  `meetingDecisions`      Confirmed decisions     meetingId, text,
                                                  context, status,
                                                  createdBy

  `actionItems`           Follow-up tasks         meetingId, title,
                                                  ownerId, dueAt,
                                                  priority, status,
                                                  sourceSegment

  `minutesDocuments`      Formal MoM records      meetingId, content,
                                                  status, version,
                                                  approvedBy, publishedAt

  `notifications`         In-app notifications    userId, organizationId,
                                                  type, payload, readAt

  `auditLogs`             Security and governance organizationId,
                          events                  actorId, action,
                                                  targetType, targetId,
                                                  timestamp, metadata

  `processingJobs`        Durable processing      meetingId, jobType,
                          state                   status, attempts,
                                                  errorCode
  -----------------------------------------------------------------------

### 8.2 Data Modeling Rules

-   Use explicit `organizationId` on every tenant-owned document,
    including records that also reference a meeting.
-   Validate that referenced records belong to the same organization
    before reads or writes.
-   Add indexes for common filters, unique constraints, and lifecycle
    queries.
-   Use compound indexes such as `{ organizationId, startAt }`,
    `{ organizationId, status }`, and `{ meetingId, createdAt }` where
    appropriate.
-   Avoid unbounded arrays for transcript segments, chat messages, or
    action items embedded in a meeting document. Store high-volume
    records separately.
-   Use MongoDB TTL indexes only for data whose deletion semantics are
    genuinely time-based and safe. Do not use TTL as the only
    enforcement mechanism for complex retention policies.
-   Store large media and files in object storage; keep metadata and
    access controls in MongoDB.
-   Use soft deletion only where there is a defined recovery and
    retention policy. Legal deletion requirements must be handled
    explicitly.
-   Store timestamps in UTC and retain the original IANA timezone for
    display and recurrence interpretation.
-   Never store raw meeting access tokens, refresh tokens, or provider
    secrets in plaintext.

### 8.3 Relationships (Logical)

``` text
Organization
 ├── Memberships ── Users
 ├── Roles
 ├── Invitations
 └── Meetings
      ├── Meeting Participants
      │    └── Meeting Sessions
      ├── Agenda Items
      ├── Notes
      ├── Chat Messages
      ├── Files
      ├── Recording
      │    └── Transcript
      │         └── Transcript Segments
      ├── AI Summary Versions
      ├── Decisions
      ├── Action Items
      ├── Minutes Versions
      └── Audit Events
```

------------------------------------------------------------------------

## 9. Technical Architecture

### 9.1 Existing Starterpack Baseline

The implementation should reuse the existing repository capabilities:

  -----------------------------------------------------------------------
  Existing capability                 Meetrix usage
  ----------------------------------- -----------------------------------
  Bun workspaces and Turborepo        Shared development, test, lint, and
                                      build workflows

  Express 5 backend                   REST API, authentication,
                                      authorization, meeting domain

  TanStack Start + React 19           Web application and meeting user
                                      interface

  MongoDB + Mongoose                  Application persistence

  Redis + BullMQ                      Asynchronous email, recording,
                                      transcription, AI, and notification
                                      jobs

  JWT access/refresh tokens           User sessions

  RBAC                                Organization and resource
                                      permissions

  Docker Compose                      Local and self-hosted development
                                      stack

  Pulumi + Ansible                    Infrastructure provisioning and
                                      deployment

  GitHub Actions                      CI/CD
  -----------------------------------------------------------------------

Do not rewrite existing authentication and RBAC merely to introduce
meeting features. Extend them with tenant membership and resource-level
checks.

### 9.2 Proposed Logical Architecture

``` text
                         Web Browser
                              |
                       TanStack Start
                              |
                    HTTPS / WebSocket
                              |
                       Express API
                              |
        ┌─────────────────────┼─────────────────────┐
        |                     |                     |
    MongoDB                 Redis              Object Storage
        |                     |
        |                 BullMQ Queues
        |                     |
        |              Background Workers
        |               /       |       \
        |          Recording  Transcribe  AI Summary
        |             |          |           |
        |             └──────────┴───────────┘
        |
        └──────────── Application Data

 Browser ───── WebRTC media ───── LiveKit SFU
    |                                  |
    └──── ICE / TURN connectivity ────┘
                                       |
                                  Egress / Recording
                                       |
                                  Object Storage

 LiveKit Webhooks ─────────────── Express API
```

### 9.3 WebRTC and Media Infrastructure

**Recommended initial approach: LiveKit**

Responsibilities: - Create and manage media rooms. - Publish and
subscribe to audio/video tracks. - Handle screen sharing tracks. -
Provide participant and room events. - Support recording/egress through
the chosen deployment. - Provide token-based room access.

Application responsibilities: - Validate the user and meeting
membership. - Check meeting state and access policy. - Generate
short-lived LiveKit access tokens with minimum required grants. -
Persist meeting and attendance records. - Validate webhook authenticity
and process events idempotently. - Enforce host/moderator permissions
independently of client UI state.

Infrastructure requirements: - A publicly reachable HTTPS/WSS endpoint
for signaling. - UDP media connectivity and a documented fallback
strategy. - TURN for restrictive NAT/firewall environments. - TLS
certificates and secure provider credentials. - Capacity monitoring for
CPU, bandwidth, packet loss, and active participants. - A tested
recording/egress path. - A separate staging environment for browser,
network, and device compatibility testing.

**Important:** WebRTC media is not ordinary REST traffic. A deployment
that only exposes HTTP/HTTPS may not be sufficient for reliable media
connectivity. Network ports, UDP reachability, TURN/TLS fallback,
firewall rules, and the LiveKit deployment topology must be designed and
tested before production.

### 9.4 Background Processing Pipeline

Use BullMQ for asynchronous tasks. Suggested queues:

  -----------------------------------------------------------------------
  Queue                               Job examples
  ----------------------------------- -----------------------------------
  `email`                             Invitations, reminders, publication
                                      notices

  `recording`                         Recording finalization, metadata
                                      validation, storage checks

  `transcription`                     Audio extraction/normalization,
                                      speech-to-text

  `meeting-ai`                        Summary, decisions, action-item
                                      extraction, MoM draft

  `notifications`                     In-app notifications and delivery

  `maintenance`                       Retention checks, cleanup,
                                      reconciliation
  -----------------------------------------------------------------------

Each job should: - Have a stable job ID or idempotency key. - Track
status, attempts, timestamps, and safe error metadata. - Use bounded
retries and exponential backoff. - Avoid duplicating external side
effects. - Support dead-letter or failed-job inspection and controlled
replay. - Never log raw meeting content or secrets unnecessarily.

A meeting can have independent processing states for recording,
transcription, and AI. Do not represent all processing with one boolean.

### 9.5 AI Provider Abstraction

Create an internal interface such as:

``` ts
interface MeetingAIProvider {
  generateSummary(input: SummaryInput): Promise<SummaryResult>;
  extractDecisions(input: ExtractionInput): Promise<DecisionResult[]>;
  extractActionItems(input: ExtractionInput): Promise<ActionItemProposal[]>;
  generateMinutes(input: MinutesInput): Promise<MinutesDraft>;
}
```

The implementation should support provider adapters without leaking
vendor-specific response structures into domain services.

Requirements: - Store provider and model identifiers with each output. -
Keep prompts and output schemas versioned. - Validate model output with
Zod before persistence. - Use structured output where supported. - Set
token/audio limits and organization-level usage controls. - Redact or
minimize sensitive content where feasible. - Provide a manual fallback
when AI is unavailable. - Do not allow model output to directly execute
application commands.

### 9.6 Storage

Use private S3-compatible object storage for: - Meeting recordings. -
Uploaded meeting materials. - Generated exports. - Optional audio
processing artifacts.

Requirements: - Private buckets by default. - Randomized object keys; do
not use user-provided filenames as storage paths. - Short-lived signed
URLs issued only after authorization. - Encryption in transit and at
rest. - Configurable lifecycle and retention policies. - File size and
MIME-type validation. - Malware scanning for uploaded files where
operationally feasible. - Separate storage namespaces or prefixes per
tenant, with authorization enforced by the application.

### 9.7 API Design

Base path: `/api/v1`

Suggested resource groups:

  ---------------------------------------------------------------------------------------------
  Resource                            Example endpoints
  ----------------------------------- ---------------------------------------------------------
  Organizations                       `GET /organizations`,
                                      `GET /organizations/:organizationId`

  Members                             `GET /organizations/:organizationId/members`,
                                      `POST /organizations/:organizationId/invitations`

  Meetings                            `GET /meetings`, `POST /meetings`,
                                      `GET /meetings/:meetingId`, `PATCH /meetings/:meetingId`

  Meeting participants                `GET /meetings/:meetingId/participants`,
                                      `POST /meetings/:meetingId/participants`

  Meeting agenda                      `GET /meetings/:meetingId/agenda`,
                                      `PUT /meetings/:meetingId/agenda`

  Meeting notes                       `GET /meetings/:meetingId/notes`,
                                      `POST /meetings/:meetingId/notes`

  Meeting room                        `POST /meetings/:meetingId/join-token`,
                                      `POST /meetings/:meetingId/end`

  Attendance                          `GET /meetings/:meetingId/attendance`

  Recordings                          `GET /meetings/:meetingId/recordings`,
                                      `POST /meetings/:meetingId/recordings/start`

  Transcripts                         `GET /meetings/:meetingId/transcript`

  AI                                  `POST /meetings/:meetingId/ai/generate`,
                                      `GET /meetings/:meetingId/ai/status`

  Minutes                             `GET /meetings/:meetingId/minutes`,
                                      `PATCH /minutes/:minutesId`,
                                      `POST /minutes/:minutesId/publish`

  Decisions                           `GET /meetings/:meetingId/decisions`,
                                      `POST /meetings/:meetingId/decisions`

  Action items                        `GET /action-items`,
                                      `POST /meetings/:meetingId/action-items`,
                                      `PATCH /action-items/:actionItemId`

  Search                              `GET /search`

  Notifications                       `GET /notifications`,
                                      `PATCH /notifications/:notificationId/read`

  Policies                            `GET /organizations/:organizationId/meeting-policies`,
                                      `PATCH /organizations/:organizationId/meeting-policies`

  Audit logs                          `GET /organizations/:organizationId/audit-logs`

  Webhooks                            `POST /webhooks/livekit`
  ---------------------------------------------------------------------------------------------

Endpoint names are illustrative. Final routes must follow the existing
codebase conventions.

### 9.8 Real-Time Application Events

Use LiveKit for media and room-level media events. Use application
WebSocket or Server-Sent Events only for application-specific updates
not already provided by LiveKit.

Potential application events: - `meeting.updated` -
`meeting.participant.invited` - `meeting.attendance.updated` -
`meeting.minutes.processing` - `meeting.minutes.published` -
`meeting.action_item.updated` - `meeting.recording.ready` -
`meeting.transcription.ready` - `meeting.ai_summary.ready`

All event payloads must be tenant- and resource-authorized. Clients must
be able to recover state through normal API reads after reconnecting.

------------------------------------------------------------------------

## 10. Security, Privacy, and Compliance

Enterprise meeting data can contain confidential business information.
Security and privacy are release requirements, not optional
enhancements.

### 10.1 Authentication and Session Security

-   Reuse the starterpack's short-lived access token and refresh-token
    rotation approach.
-   Store refresh-token hashes rather than plaintext.
-   Revoke sessions on logout and support account/session revocation.
-   Use secure, HttpOnly, SameSite cookies where compatible with the
    chosen deployment and frontend architecture. Document any token
    storage exception.
-   Apply rate limits to login, invitation, password reset, and token
    endpoints.
-   Protect against brute force, replay, CSRF where cookie-based
    authentication applies, and XSS.

### 10.2 Tenant Isolation

-   Derive tenant context from authenticated membership and validated
    organization selection, not an untrusted request body alone.
-   Apply tenant filters in every repository/service operation.
-   Verify ownership of every referenced meeting, recording, transcript,
    file, and action item.
-   Include automated cross-tenant authorization tests.
-   Ensure background jobs carry and validate organization context.
-   Ensure search and object-storage access cannot bypass tenant checks.

### 10.3 Meeting Access

-   Use cryptographically secure, unguessable invitation tokens.
-   Store token hashes where possible.
-   Make guest links revocable and optionally expiring.
-   Issue short-lived media tokens with minimal grants.
-   Validate host privileges server-side for destructive meeting
    controls.
-   Validate webhook signatures and reject replayed or malformed events.
-   Do not trust participant IDs or role claims supplied by the browser.

### 10.4 Recording and AI Consent

-   Show a clear recording indicator.
-   Provide configurable participant notification and acknowledgement
    workflows.
-   Make recording and AI transcription settings visible before a
    meeting starts.
-   Allow organization administrators to disable recording or AI
    processing.
-   Respect applicable privacy, employment, data protection, and
    recording-consent laws in the jurisdictions where the product is
    deployed.
-   Define retention, deletion, export, and access policies.
-   Document which third-party providers receive audio, transcripts, or
    other meeting data.
-   Do not promise end-to-end confidentiality if media is processed by
    server-side recording or transcription services.

### 10.5 Audit Events

Audit at minimum: - Authentication and session security events. - Member
invitations, role changes, and removals. - Meeting creation, changes,
cancellation, and deletion. - Guest access changes. - Recording
start/stop, playback, download, and deletion. - Transcript and AI
processing requests. - Minutes approval, publication, and revision. -
Action item assignment and status changes. - Policy and retention
changes. - Administrative support access.

Audit logs should be append-oriented, access-controlled, timestamped,
and protected from ordinary tenant users modifying historical events.

### 10.6 Data Retention and Deletion

Organizations should be able to configure retention periods for
recordings and transcripts, subject to platform and legal constraints.
Deletion workflows must cover object storage, derived artifacts,
indexes, and relevant metadata. The product must document backup
retention and the difference between logical deletion and eventual
physical erasure.

------------------------------------------------------------------------

## 11. Non-Functional Requirements

  -----------------------------------------------------------------------
  Category                            Requirement
  ----------------------------------- -----------------------------------
  Availability                        Initial target 99.5% monthly for
                                      core application services,
                                      excluding documented provider
                                      outages

  Performance                         p95 under 500 ms for common
                                      non-search API reads under normal
                                      pilot load

  Search                              p95 under 2 seconds for normal
                                      indexed queries

  Scalability                         Horizontal scaling for API and
                                      workers; media capacity scaled
                                      independently

  Reliability                         Durable queues, idempotent jobs,
                                      retries, and observable failure
                                      states

  Security                            Tenant isolation, RBAC, TLS,
                                      encrypted storage, secret
                                      management, audit trails

  Accessibility                       Target WCAG 2.2 AA for core web
                                      workflows

  Browser support                     Current and previous major versions
                                      of Chrome, Edge, Firefox, and
                                      Safari where supported by media
                                      provider capabilities

  Localization                        Initial UI language English;
                                      architecture should support
                                      Indonesian and other locales

  Timezones                           UTC persistence with IANA
                                      timezone-aware display and
                                      recurrence

  Observability                       Structured logs, metrics, tracing,
                                      health checks, and alerting

  Backup                              Automated database and
                                      object-storage backup strategy with
                                      tested restoration

  Maintainability                     TypeScript strictness, Zod
                                      validation, modular domain
                                      services, automated tests

  Data governance                     Configurable retention, export,
                                      deletion, and controlled support
                                      access
  -----------------------------------------------------------------------

WebRTC quality depends on client hardware, browser, network, geography,
and media-server capacity. Define separate media SLOs for connection
success, packet loss, latency, and reconnection after real pilot
measurements.

------------------------------------------------------------------------

## 12. Testing and Quality Assurance

### 12.1 Backend Tests

-   Unit tests for meeting lifecycle and permission rules.
-   Integration tests for MongoDB repositories and tenant filters.
-   API tests for scheduling, invitations, join-token issuance, minutes,
    and action items.
-   Negative tests for unauthorized cross-tenant access.
-   Webhook signature and idempotency tests.
-   BullMQ retry, duplicate delivery, and failed-job tests.
-   AI output schema validation and malformed response tests.

### 12.2 Frontend Tests

-   Authentication and organization switching.
-   Meeting creation and editing.
-   Pre-join device selection.
-   Meeting room controls.
-   Participant and waiting-room management.
-   Minutes editing and publishing.
-   Action item review.
-   Loading, empty, error, and reconnect states.
-   Keyboard navigation and accessibility.

### 12.3 WebRTC Tests

-   One-to-one and multi-participant calls.
-   Camera and microphone permission denied.
-   Device unplug/replug.
-   Browser tab refresh and network reconnect.
-   UDP blocked / TURN fallback.
-   Screen sharing start/stop.
-   Participant removal and room lock.
-   Host leaves unexpectedly.
-   Recording start/stop and egress failure.
-   Load tests at expected participant counts and geographic conditions.

### 12.4 AI Evaluation

Create a consented test corpus of representative meeting
recordings/transcripts. Evaluate: - Summary factual consistency. -
Decision extraction precision and recall. - Action item extraction
precision and recall. - Owner and due-date accuracy. - Hallucination
rate. - Transcript timestamp alignment. - Language handling. -
Prompt-injection resistance. - Cost and processing latency.

AI quality must be assessed on a human-reviewed evaluation set before
production claims are made.

------------------------------------------------------------------------

## 13. Delivery Roadmap

Do not build every feature at once. Deliver the product in phases, with
each phase producing a testable and deployable increment.

### Phase 1 --- Foundation and Enterprise Identity

**Objective:** establish secure multi-tenant foundations.

-   Review and stabilize the starterpack.
-   Add organization and membership models.
-   Extend RBAC for tenant and resource permissions.
-   Add organization invitations and member management.
-   Add meeting-related audit events.
-   Establish meeting domain modules and API conventions.
-   Add organization-aware frontend navigation.
-   Add automated tenant-isolation tests.

**Exit criteria** - Users can belong to an organization. - Admins can
invite and manage members. - Cross-tenant access tests pass. - Existing
authentication flows remain functional.

### Phase 2 --- Meeting Management

**Objective:** users can prepare and manage meetings.

-   Meeting CRUD and lifecycle.
-   Participant invitations and guest access.
-   Agenda management.
-   Meeting detail page.
-   Meeting calendar/list views.
-   Email invitations and reminders.
-   Meeting access policies.
-   Meeting templates (if time permits).

**Exit criteria** - A host can create and invite participants to a
meeting. - Participants can access only meetings they are authorized to
access. - Meeting updates and cancellation notifications work.

### Phase 3 --- WebRTC Meeting Experience

**Objective:** deliver reliable real-time meetings.

-   Deploy LiveKit in a development/staging environment.
-   Configure TLS, signaling, UDP, and TURN.
-   Implement backend token issuance.
-   Build pre-join device testing.
-   Build video room, audio/video controls, screen sharing, and chat.
-   Implement waiting room and host controls.
-   Integrate room webhooks and attendance sessions.
-   Test reconnect and media quality.

**Exit criteria** - Authorized participants can join and communicate. -
Unauthorized participants cannot join. - Host controls work
server-side. - Attendance is reconciled correctly after reconnects. -
TURN fallback and recording topology are validated.

### Phase 4 --- Notes, Attendance, and Meeting Records

**Objective:** make meetings operationally accountable.

-   Attendance reports.
-   Agenda-linked notes.
-   Decisions.
-   Action items.
-   Minutes editor.
-   Approval and publication workflow.
-   Meeting file attachments.
-   Audit and revision history.

**Exit criteria** - A host can publish official minutes. - Action items
have owners and due dates. - Published records preserve revision
history. - Attendance can be reviewed and exported.

### Phase 5 --- Recording and AI Meeting Intelligence

**Objective:** convert meeting content into searchable outcomes.

-   Recording/egress integration.
-   Private object storage.
-   Recording playback and authorization.
-   Transcription provider adapter.
-   Transcript viewer with timestamps.
-   AI summary generation.
-   Decision and action-item extraction.
-   Draft MoM generation.
-   Human review and approval.
-   Processing status, retries, and cost monitoring.
-   Consent and retention enforcement.

**Exit criteria** - Eligible meetings can be recorded and processed. -
Participants receive required recording notices. - Authorized users can
view recordings and transcripts. - AI outputs are editable drafts and do
not automatically publish or execute actions. - Failed processing can be
retried without data loss.

### Phase 6 --- Enterprise Governance and Integrations

**Objective:** prepare for broader organizational adoption.

-   Advanced organization policies.
-   SSO/OIDC/SAML.
-   Advanced retention and export.
-   Usage and storage dashboards.
-   Calendar integration.
-   External project/task integrations.
-   Advanced search across authorized meeting records.
-   Operational dashboards and alerting.
-   Disaster recovery and restore drills.
-   Security review and penetration testing.

**Exit criteria** - Organization admins can govern access and
retention. - Integrations use scoped credentials and auditable
actions. - Production operations have documented recovery procedures.

------------------------------------------------------------------------

## 14. Suggested Repository Structure

Keep the existing monorepo structure. Extend it in a way that follows
the starterpack's conventions rather than introducing a new architecture
prematurely.

Illustrative backend structure:

``` text
backend/src/
├── config/
├── controllers/
├── emails/
├── lib/
├── middleware/
├── models/
│   ├── organization.model.ts
│   ├── membership.model.ts
│   ├── meeting.model.ts
│   ├── meeting-participant.model.ts
│   ├── meeting-session.model.ts
│   ├── meeting-agenda-item.model.ts
│   ├── meeting-note.model.ts
│   ├── recording.model.ts
│   ├── transcript.model.ts
│   ├── transcript-segment.model.ts
│   ├── meeting-summary.model.ts
│   ├── meeting-decision.model.ts
│   ├── action-item.model.ts
│   └── minutes-document.model.ts
├── queue/
│   ├── email.queue.ts
│   ├── recording.queue.ts
│   ├── transcription.queue.ts
│   ├── meeting-ai.queue.ts
│   └── notifications.queue.ts
├── routes/
│   ├── organizations.routes.ts
│   ├── meetings.routes.ts
│   ├── meeting-room.routes.ts
│   ├── recordings.routes.ts
│   ├── transcripts.routes.ts
│   ├── minutes.routes.ts
│   └── action-items.routes.ts
├── services/
│   ├── organizations/
│   ├── meetings/
│   ├── participants/
│   ├── attendance/
│   ├── rtc/
│   ├── recordings/
│   ├── transcription/
│   ├── meeting-ai/
│   ├── minutes/
│   └── action-items/
├── validators/
├── workers/
│   ├── email.worker.ts
│   ├── recording.worker.ts
│   ├── transcription.worker.ts
│   ├── meeting-ai.worker.ts
│   └── notifications.worker.ts
└── tests/
```

Illustrative frontend routes:

``` text
frontend/src/routes/
├── _auth/
├── _app/
│   ├── dashboard/
│   ├── meetings/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── $meetingId/
│   │       ├── index.tsx
│   │       ├── room.tsx
│   │       ├── minutes.tsx
│   │       └── recording.tsx
│   ├── calendar/
│   ├── action-items/
│   ├── search/
│   └── settings/
└── meeting-join/
    └── $inviteToken.tsx
```

This is a target organization, not a requirement to move or rename
existing starterpack files. Preserve working paths and conventions
unless a deliberate refactor is approved.

------------------------------------------------------------------------

## 15. Deployment and Infrastructure

### 15.1 Application Services

  -----------------------------------------------------------------------
  Service                             Responsibility
  ----------------------------------- -----------------------------------
  Web frontend                        TanStack Start application

  API                                 Express application

  Worker                              BullMQ background jobs; may be
                                      deployed as separate worker
                                      processes by queue

  MongoDB                             Application database

  Redis                               Queue and ephemeral coordination

  LiveKit                             WebRTC signaling and SFU media

  TURN                                NAT traversal fallback

  Object storage                      Recordings, attachments, exports

  Reverse proxy                       TLS termination and HTTP routing

  Monitoring                          Logs, metrics, alerts, and service
                                      health
  -----------------------------------------------------------------------

### 15.2 Deployment Environments

Reuse the starterpack's environment strategy: - `development` -
`staging` - `stress-test` - `production`

The media layer should be included in staging and stress-test
environments. Do not validate only the REST API and assume that WebRTC
will work in production.

### 15.3 Production Considerations

-   Do not run all components on a single small VPS and assume it is
    production-ready.
-   Scale media infrastructure based on concurrent rooms, participants,
    bitrate, geography, and recording load.
-   Keep database and Redis private to the application network.
-   Use managed MongoDB/Redis or appropriately backed-up self-hosted
    services based on operational capacity.
-   Store credentials in the existing secret-management workflow, not in
    Git.
-   Use separate credentials for development, staging, and production.
-   Configure backups and test restoration.
-   Monitor API, worker, database, queue, object storage, and media
    server independently.
-   Define alerting for failed recording, queue backlog, transcription
    errors, and media capacity.

------------------------------------------------------------------------

## 16. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  WebRTC connectivity     Participants cannot     TURN fallback, network
  varies across networks  join or experience poor testing, media metrics,
                          media                   documented port
                                                  requirements

  SFU capacity is         Poor audio/video        Load testing, capacity
  underestimated          quality at peak usage   planning, horizontal
                                                  media scaling

  Recording consumes      High operating cost     Retention policies,
  significant                                     quotas, recording
  bandwidth/storage                               controls, storage
                                                  monitoring

  AI summaries            Incorrect business      Human approval,
  hallucinate             records                 transcript references,
                                                  structured output
                                                  validation

  Transcript quality is   Incorrect summaries and Audio quality guidance,
  poor                    action items            provider evaluation,
                                                  manual correction

  Tenant filtering is     Confidential data       Centralized tenant
  missed                  exposure                context, repository
                                                  guards, cross-tenant
                                                  tests

  Duplicate webhook/job   Incorrect attendance or Idempotency keys and
  delivery                duplicate outputs       durable processing
                                                  states

  AI provider outage or   Delayed meeting reports Provider abstraction,
  rate limits                                     retries, manual
                                                  workflow, status
                                                  visibility

  Recording consent is    Legal and reputational  Organization policy,
  mishandled              risk                    clear notices, consent
                                                  records, legal review

  Scope becomes too large Delayed first release   Phased roadmap and
                                                  strict P0/P1/P2
                                                  prioritization

  Starterpack assumptions Operational complexity  Keep media plane
  do not fit real-time                            separate from API; add
  workloads                                       services incrementally
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 17. MVP Definition

The first production-oriented MVP should include:

1.  Multi-tenant organizations, memberships, and RBAC.
2.  Meeting creation, scheduling, invitations, and guest access.
3.  LiveKit-powered WebRTC meetings.
4.  Camera, microphone, screen sharing, and participant management.
5.  Waiting room and host controls.
6.  Attendance tracking.
7.  Agenda and meeting notes.
8.  Recording with participant notice and policy controls.
9.  Transcription and AI executive summary.
10. AI-proposed decisions and action items with human review.
11. Editable and publishable Minutes of Meeting.
12. Meeting history and basic search.
13. Notifications.
14. Audit logs and retention settings.

Features such as SSO, advanced integrations, recurring meeting
exceptions, advanced analytics, and mobile applications should follow
after the MVP is stable.

### 17.1 MVP Acceptance Checklist

-   [ ] Organization boundaries are enforced on every tenant-owned
    resource.
-   [ ] Admins can invite, deactivate, and manage organization members.
-   [ ] A user can create, schedule, update, and cancel a meeting.
-   [ ] Invited members and permitted guests can join.
-   [ ] Unauthorized users cannot obtain media room tokens.
-   [ ] Participants can use camera, microphone, and screen sharing.
-   [ ] Hosts can manage the waiting room and participants.
-   [ ] Join/leave events produce accurate attendance sessions.
-   [ ] Recording has a visible indicator and policy/consent handling.
-   [ ] Recording artifacts are stored privately.
-   [ ] Eligible recordings can be transcribed.
-   [ ] AI produces an editable draft summary and proposed outcomes.
-   [ ] AI output does not automatically publish minutes or execute
    tasks.
-   [ ] Authorized users can approve and publish minutes.
-   [ ] Action items can be assigned, tracked, and updated.
-   [ ] Audit events cover sensitive actions.
-   [ ] Retention and deletion behavior is documented and tested.
-   [ ] Core workflows have automated tests and staging validation.
-   [ ] WebRTC connectivity is tested with TURN fallback and realistic
    network conditions.

------------------------------------------------------------------------

## 18. Open Product Decisions

These decisions should be finalized before the relevant implementation
phase:

1.  **Hosting model:** self-host LiveKit or use a managed LiveKit
    service?
2.  **Recording policy:** host-controlled recording,
    organization-enforced recording, or both?
3.  **Consent model:** explicit participant acknowledgement, notice with
    acknowledgement, or jurisdiction-specific configurable policy?
4.  **AI provider:** which speech-to-text and LLM providers meet
    privacy, language, quality, and cost requirements?
5.  **Languages:** English-only at launch, or English and Indonesian
    from the first release?
6.  **Guest access:** can guests join without creating accounts, and
    what restrictions apply?
7.  **Meeting capacity:** what participant limit should the first
    deployment guarantee?
8.  **Storage:** which S3-compatible object storage provider will be
    used?
9.  **Retention:** what are the default recording, transcript, and audit
    retention periods?
10. **Calendar integration:** should Google Calendar and Microsoft 365
    be included in the first enterprise release?
11. **Official minutes:** which roles are allowed to approve and publish
    official MoM documents?
12. **Data residency:** are there customer or regulatory requirements
    for where recordings and transcripts are stored and processed?

------------------------------------------------------------------------

## 19. Definition of Done

A feature is considered complete only when:

-   Its business rules and permissions are implemented server-side.
-   Tenant isolation is verified.
-   Input validation and error handling are implemented.
-   Loading, empty, success, and failure states exist in the UI.
-   Unit and integration tests cover important paths.
-   Sensitive actions produce audit events.
-   Logs do not expose credentials, tokens, or unnecessary meeting
    content.
-   Documentation and environment variables are updated.
-   The feature passes CI and staging verification.
-   Operational implications (monitoring, retries, retention, and
    failure recovery) are documented.

------------------------------------------------------------------------

## 20. Final Product Direction

Meetrix should be developed as an enterprise meeting system, not merely
a video-call clone.

Its core differentiator is the complete meeting lifecycle:

**Plan → Invite → Meet → Record → Transcribe → Understand → Approve →
Follow Up**

The existing `merb-starterpack` is a suitable application foundation for
identity, API, frontend, database, queues, and deployment automation.
WebRTC media, TURN connectivity, recording/egress, and object storage
should be added as dedicated infrastructure capabilities. AI should be
an asynchronous, provider-agnostic processing layer with human review
and strong data governance.

The most important architectural boundary is to keep the application
control plane (users, organizations, meetings, permissions, records, and
workflows) separate from the real-time media plane (audio, video, screen
sharing, and media recording). This allows the product to scale and
evolve without turning the existing Express application into a media
server.
