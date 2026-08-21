<?php

namespace App\Notifications;

use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ProjectInvitation extends Notification
{
    use Queueable;

    public function __construct(
        public Project $project,
        public User $inviter,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'project_id' => $this->project->id,
            'project_name' => $this->project->name,
            'inviter_id' => $this->inviter->id,
            'inviter_name' => $this->inviter->name,
        ];
    }
}
