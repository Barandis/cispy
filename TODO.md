# Ideas to be explored

### Blocking behavior

Puts/takes don't block if there is a corresponding take/put already pending on a channel. Should they block? (Just long enough to switch to a different process, of course.)

They don't have to, but since puts/takes *do* block if there is no pending take/put, it would seem to be best for consistency. There are certain unit tests where  I resort to `yield sleep()` after an operation. This is because I know that operation isn't going to block, but I need it to switch tasks anyway. This is fine in these test cases, but it's hard to know in the general case whether a particular operation is going to block or not.

It's also hard to know whether it's useful outside of that testing edge case. This is something that needs to be considered and possibly rejected.
