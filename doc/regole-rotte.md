# Regole rotte applicativo

routes/[eventoId] questa è la rotta di default e deve essere dell'evento corrente, cioè azure-vicenza. è la rotta pubblica per gli speaker, non devono poter andare in /admin in alcun modo.

routes/admin/* è la sezione admin. Bisogna trovare un modo sicuro, nascosto, semplice per passare dalla pagina di default a quella di admin. 
Se si scrive esattamente /admin/login allora si approda alla pagina di login e se la login è successo si è dentro.

Una volta fatta la login viene salvato nel session storage uno stato di sessione attiva, così non serve riloggarsi. Questo meccanismo vale anche per gli speaker che accedono tramite hash.

al logout si cancella la sessione.
