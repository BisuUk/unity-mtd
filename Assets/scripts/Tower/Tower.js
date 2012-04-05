#pragma strict

static var baseScale : Vector3 = Vector3(0.50, 0.50, 0.50);
static var baseRange : float = 2.5;
static var baseFOV : float = 120.0;

static function PrefabName(type : int) : String
{
   var prefabName : String;
   switch (type)
   {
      default: prefabName = "prefabs/TowerPulsePrefab"; break;
   }
   return prefabName;
}

static function ScriptName(type : int) : String
{
   var scriptName : String;
   switch (type)
   {
      default: scriptName = "TowerPulse"; break;
   }
   return scriptName;
}