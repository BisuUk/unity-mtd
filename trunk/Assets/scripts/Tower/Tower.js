#pragma strict

static var baseScale : Vector3 = Vector3(0.50, 0.50, 0.50);
static var baseRange : float = 2.0;
static var baseFOV : float = 90.0;

static function PrefabName(type : int) : String
{
   var prefabName : String;
   switch (type)
   {
      default: prefabName = "TowerPulsePrefab"; break;
   }
   return prefabName;
}
