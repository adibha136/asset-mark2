<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            '/api/login',
            '/api/tenants',
            '/api/tenants/*',
            '/api/users',
            '/api/users/*',
            '/api/sync/*',
            '/api/mail-settings/*',
            '/api/checklist-templates/*',
        ]);
    })
    ->withSchedule(function ($schedule) {
        $schedule->command('sync:directory-users')
            ->everyMinute()
            ->withoutOverlapping();

        $schedule->command('notifications:check-warranty')
            ->daily()
            ->withoutOverlapping();

        $schedule->command('notifications:check-inactive')
            ->hourly()
            ->withoutOverlapping();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
