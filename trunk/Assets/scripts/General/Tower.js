#pragma strict

static function PrefabName(type : int) : String
{
   var prefabName : String;
   switch (type)
   {
      default: prefabName = "TowerPrefab"; break;
   }
   return prefabName;
}
