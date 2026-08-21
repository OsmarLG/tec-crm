<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserAdministrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_view_and_create_users(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Users')->has('users', 1));

        $this->actingAs($admin)
            ->post(route('admin.users.store'), [
                'name' => 'Ana Operaciones',
                'email' => 'ana@example.com',
                'password' => 'password',
                'is_admin' => false,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'email' => 'ana@example.com',
            'is_active' => true,
        ]);
    }

    public function test_regular_user_cannot_administer_users(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_administrator_cannot_disable_their_own_access(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.users.update', $admin), [
                'name' => $admin->name,
                'email' => $admin->email,
                'password' => null,
                'is_admin' => true,
                'is_active' => false,
            ])
            ->assertSessionHasErrors('user');

        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_inactive_user_with_an_existing_session_loses_access(): void
    {
        $user = User::factory()->create(['is_active' => false]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_inactive_user_cannot_use_the_api(): void
    {
        $user = User::factory()->create(['is_active' => false]);

        $this->actingAs($user)
            ->postJson(route('projects.store'), ['name' => 'Bloqueado'])
            ->assertForbidden();
    }
}
