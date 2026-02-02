<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('checklist_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('checklist_templates')->onDelete('cascade');
            $table->uuid('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->string('trigger_status')->comment('active, inactive, new_user, etc.');
            $table->unique(['tenant_id', 'trigger_status']);
            $table->timestamps();
        });

        Schema::create('checklist_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('checklist_assignments')->onDelete('cascade');
            $table->uuid('directory_user_id');
            $table->foreign('directory_user_id')->references('id')->on('directory_users')->onDelete('cascade');
            $table->string('status')->default('in_progress');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('checklist_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('checklist_submissions')->onDelete('cascade');
            $table->foreignId('question_id')->constrained('checklist_questions')->onDelete('cascade');
            $table->text('answer_value')->nullable();
            $table->timestamps();
        });

        Schema::create('checklist_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('checklist_submissions')->onDelete('cascade');
            $table->foreignId('question_id')->nullable()->constrained('checklist_questions');
            $table->string('user_name');
            $table->text('message');
            $table->string('action_type');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checklist_logs');
        Schema::dropIfExists('checklist_answers');
        Schema::dropIfExists('checklist_submissions');
        Schema::dropIfExists('checklist_assignments');
    }
};
