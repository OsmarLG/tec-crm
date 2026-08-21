<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * @property int $project_id
 * @property int $user_id
 * @property string $role
 */
class ProjectMembership extends Pivot
{
    protected $table = 'project_user';
}
