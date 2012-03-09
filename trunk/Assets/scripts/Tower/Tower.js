#pragma strict

static var baseScale : Vector3 = Vector3(0.50, 0.50, 0.50);

static function PrefabName(type : int) : String
{
   var prefabName : String;
   switch (type)
   {
      default: prefabName = "TowerPrefab"; break;
   }
   return prefabName;
}
