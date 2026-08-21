<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display a listing of the projects.
     */
    public function index(Request $request): Response
    {
        $projects = Project::query()
            ->whereHas('members', fn ($query) => $query->whereKey($request->user()->id))
            ->active()
            ->withCount('tasks')
            ->latest()
            ->get();

        return Inertia::render('Projects/Index', [
            'projects' => ProjectResource::collection($projects)->resolve(),
        ]);
    }

    /**
     * Store a newly created project.
     */
    public function store(ProjectRequest $request): RedirectResponse
    {
        $project = $request->user()->projects()->create($request->validated());

        $project->createDefaultStatuses();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project created.')]);

        return to_route('projects.show', $project);
    }

    /**
     * Display the specified project.
     */
    public function show(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $project->load([
            'statuses.tasks' => fn ($query) => $query->with(['assignee', 'assignees', 'module', 'tags'])->orderBy('position'),
            'members' => fn ($query) => $query->orderBy('name'),
            'whiteboards',
            'modules',
            'tags',
        ]);

        return Inertia::render('Projects/Show', [
            'project' => (new ProjectResource($project))->resolve(),
        ]);
    }

    /**
     * Update the specified project.
     */
    public function update(ProjectRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validated();

        if (isset($validated['archived'])) {
            $project->archived_at = $validated['archived'] ? now() : null;
            unset($validated['archived']);
        }

        $project->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project updated.')]);

        return back();
    }

    /**
     * Remove the specified project.
     */
    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project deleted.')]);

        return to_route('projects.index');
    }
}
