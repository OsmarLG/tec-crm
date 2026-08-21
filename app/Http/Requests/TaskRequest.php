<?php

namespace App\Http\Requests;

use App\Enums\TaskPriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'task_status_id' => [$required, 'integer', 'exists:task_statuses,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'title' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'details' => ['nullable', 'array'],
            'details.type' => ['nullable', 'string', Rule::in(['doc'])],
            'details.content' => ['nullable', 'array'],
            'assignee_ids' => ['sometimes', 'array'],
            'assignee_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'priority' => ['sometimes', 'string', Rule::in(TaskPriority::values())],
            'due_date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date', 'before_or_equal:due_date'],
            'module_name' => ['nullable', 'string', 'max:80'],
            'tag_names' => ['sometimes', 'array', 'max:10'],
            'tag_names.*' => ['string', 'max:40'],
        ];
    }
}
