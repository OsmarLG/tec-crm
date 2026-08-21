<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectWhiteboard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WhiteboardController extends Controller
{
    public function legacy(Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $diagram = $project->whiteboards()->first()
            ?? $project->whiteboards()->create(['name' => __('Diagrama principal')]);

        return to_route('projects.diagrams.show', [$project, $diagram]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('project_whiteboards', 'name')->where('project_id', $project->id),
            ],
        ]);

        $diagram = $project->whiteboards()->create([
            'name' => $validated['name'],
            'elements' => [],
            'app_state' => [],
            'files' => [],
            'library_items' => [],
            'updated_by' => $request->user()->id,
        ]);

        return to_route('projects.diagrams.show', [$project, $diagram]);
    }

    public function show(Project $project, ProjectWhiteboard $diagram): Response
    {
        $this->authorize('view', $project);
        $this->ensureDiagramBelongsToProject($project, $diagram);

        return Inertia::render('Projects/Whiteboard', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'diagram' => [
                'id' => $diagram->id,
                'name' => $diagram->name,
                'elements' => $diagram->elements ?? [],
                'app_state' => $diagram->app_state ?? [],
                'files' => $diagram->files ?? [],
                'library_items' => $diagram->library_items ?? [],
            ],
            'diagrams' => $project->whiteboards()->get()->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'updated_at' => $item->updated_at?->toIso8601String(),
            ])->values()->all(),
        ]);
    }

    public function update(Request $request, Project $project, ProjectWhiteboard $diagram): RedirectResponse
    {
        $this->authorize('view', $project);
        $this->ensureDiagramBelongsToProject($project, $diagram);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('project_whiteboards', 'name')
                    ->where('project_id', $project->id)
                    ->ignore($diagram->id),
            ],
            'elements' => ['sometimes', 'array'],
            'app_state' => ['sometimes', 'array'],
            'files' => ['sometimes', 'array'],
            'library_items' => ['sometimes', 'array'],
        ]);

        $diagram->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Diagram saved.')]);

        return back();
    }

    public function destroy(Project $project, ProjectWhiteboard $diagram): RedirectResponse
    {
        $this->authorize('view', $project);
        $this->ensureDiagramBelongsToProject($project, $diagram);

        $diagram->delete();

        return to_route('projects.show', $project);
    }

    private function ensureDiagramBelongsToProject(Project $project, ProjectWhiteboard $diagram): void
    {
        abort_unless($diagram->project_id === $project->id, 404);
    }
}
