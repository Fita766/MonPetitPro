# Migration de la base DMO

La migration [`202607200001_dmo_extension.sql`](../supabase/migrations/202607200001_dmo_extension.sql) est additive et rejouable. Elle ne charge aucune donnée provenant des classeurs Excel.

## Application

1. Sauvegarder la base Supabase.
2. Exécuter la migration depuis le SQL Editor Supabase ou avec la CLI Supabase.
3. Promouvoir le premier administrateur en remplaçant l'adresse :

```sql
update public.profiles
set role = 'admin'
where email = 'adresse-du-responsable@exemple.fr';
```

4. Vérifier que le bucket privé `operation-documents` existe.
5. Se reconnecter à l'application pour recharger le profil.

## Compatibilité

Les anciennes colonnes restent en place. Le mapping conservé est :

- `contractual_delivery_date` : AZ, livraison contractuelle ;
- `expected_delivery_date` : BL, dernière livraison prévisionnelle ;
- `actual_delivery_date` : BN, livraison réelle ;
- `daact_date` : BX, dépôt DAACT.

Les nouvelles colonnes sont facultatives ou disposent d'une valeur par défaut. Une opération créée avant la migration reste donc lisible et modifiable.

## Contrôles rapides

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'operations'
order by ordinal_position;

select tablename, policyname
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, policyname;

select id, name, public
from storage.buckets
where id = 'operation-documents';
```
