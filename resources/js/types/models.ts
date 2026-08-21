import type { JSONContent } from '@tiptap/core';

export type UserSummary = {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
};

export type Project = {
    id: number;
    name: string;
    description?: string;
    color: string;
    archived_at?: string;
    is_archived: boolean;
    can_manage_members?: boolean;
    can_delete?: boolean;
    tasks_count?: number;
    statuses?: TaskStatus[];
    members?: ProjectMember[];
    diagrams?: DiagramSummary[];
    modules?: TaskClassification[];
    tags?: TaskClassification[];
    created_at: string;
    updated_at: string;
};

export type ProjectInvitation = {
    id: string;
    project_id: number;
    project_name: string;
    inviter_id: number;
    inviter_name: string;
    created_at: string;
};

export type ProjectMember = UserSummary & {
    role: 'owner' | 'member';
};

export type DiagramSummary = {
    id: number;
    name: string;
    updated_at?: string;
};

export type TaskClassification = {
    id: number;
    name: string;
    color: string;
};

export type RichTextNode = JSONContent;

export type RichTextDocument = JSONContent & {
    type: 'doc';
};

export type TaskStatus = {
    id: number;
    project_id: number;
    name: string;
    color: string;
    position: number;
    is_done: boolean;
    tasks?: Task[];
};

export type Task = {
    id: number;
    project_id: number;
    task_status_id: number;
    title: string;
    description?: string;
    details?: RichTextDocument;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    position: number;
    due_date?: string;
    start_date?: string;
    completed_at?: string;
    module?: TaskClassification;
    tags?: TaskClassification[];
    assignee?: {
        id: number;
        name: string;
        email: string;
    };
    assignees?: UserSummary[];
    created_at: string;
    updated_at: string;
};

export type Whiteboard = {
    id: number;
    name: string;
    elements: any[];
    app_state: Record<string, any>;
    files: Record<string, any>;
    library_items: any[];
};
