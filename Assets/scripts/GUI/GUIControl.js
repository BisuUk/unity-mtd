#pragma strict

static var previewCamera : GameObject;
static var groundPlane : GameObject;
static var pulsateDuration : float;
static var pulsateScale : float;
static var cursorObject : GameObject;

function Awake()
{
   // Create a ground plane for mouse interactions
   groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
   groundPlane.transform.position = Vector3(0,-1,0);
   groundPlane.transform.localScale = Vector3(100,100,100);
   groundPlane.renderer.enabled = false;
   groundPlane.layer = 9; // GUI layer
   groundPlane.name = "GroundPlane";

   previewCamera = GameObject.Find("GUIPreviewCamera");
   previewCamera.camera.enabled = false;
}

function Update ()
{

}

static function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, pulsateDuration) / pulsateDuration;
   pulsateScale = Mathf.Lerp(0.0, 0.05, t);
}


static function NewCursor(entType : int, type : int)
{
   //Debug.Log("NewCursor: sides="+sides);
   if (cursorObject)
   {
      for (var child : Transform in cursorObject.transform)
         Destroy(child.gameObject);
      Destroy(cursorObject);
   }
   var prefabName : String;
   // 1=UNIT; 2=TOWER
   if (entType == 1)
   {
      prefabName = Unit.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "AttackGUICursor";
      cursorObject.GetComponent(Collider).enabled = false;
      cursorObject.GetComponent(Unit).enabled = false;

      var cursorScript = cursorObject.AddComponent(AttackGUICursorControl);
      cursorScript.setFromSquad(GameData.player.selectedSquad);

      cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
   }
   else if (entType == 2)
   {
      prefabName = TowerUtil.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "DefendGUICursor";
      cursorObject.tag = "";
      cursorObject.AddComponent(DefendGUICursorControl);
      cursorObject.GetComponent(Collider).enabled = false;

      cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
   }


}