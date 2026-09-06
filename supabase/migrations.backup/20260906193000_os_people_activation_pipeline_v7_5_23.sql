-- v7.5.23 production parity marker.
-- The People Activation staging schema/functions were applied to production before
-- this repository migration file was reconstructed. This marker is intentionally
-- non-mutating so replaying the repository does not duplicate the already-live DDL.
-- See OS_V7.5.23_CHANGELOG.md for the activation contract.
select 1;
