# Contributing

Keep examples focused, at most 150 source lines per file, and explain why the
important choices matter. Use standard clients; examples must run without a Triport SDK.
Update the example table and language README when adding a program.

Run the static checks in all affected language directories. Keep CI static and
independent of credentials. Never commit `.env`, keypairs, generated histories or
server diagnostics. Use synthetic fixtures if adding offline tests.
