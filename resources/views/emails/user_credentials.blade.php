<!DOCTYPE html>
<html>
<head>
    <title>Your Account Credentials</title>
</head>
<body>
    <h1>Hello, {{ $user->name }}!</h1>
    <p>Your account has been created successfully. Below are your login credentials:</p>
    <ul>
        <li><strong>Username (Email):</strong> {{ $user->email }}</li>
        <li><strong>Password:</strong> {{ $password }}</li>
    </ul>
    <p>Please log in and change your password as soon as possible.</p>
    <p>Regards,<br>{{ config('app.name') }} Team</p>
</body>
</html>
