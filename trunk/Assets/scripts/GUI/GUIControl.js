#pragma strict
#pragma downcast

static var previewCamera : GameObject;
static var groundPlane : GameObject;
static var colorPulsateDuration : float = 0.25;
static var colorPulsateValue : float;
static var pulsateScale : float;
static var cursorObject : GameObject;
static var attackGUI : AttackGUI;
static var defendGUI : DefendGUI;
static var networkGUI : NetworkGUI;
static var activeGUI : int;

static private var lastAttacker;

function Awake()
{
   attackGUI = GetComponent(AttackGUI);
   defendGUI = GetComponent(DefendGUI);
   networkGUI = GetComponent(NetworkGUI);

   // Create a ground plane for mouse interactions
   groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
   groundPlane.transform.position = Vector3(0,0.5,0);
   groundPlane.transform.localScale = Vector3(100,100,100);
   groundPlane.renderer.enabled = false;
   groundPlane.layer = 2; // Ignore Raycast layer
   groundPlane.name = "GroundPlane";

   // Detach preview camera from main
   previewCamera = GameObject.Find("GUIPreviewCamera");
   previewCamera.transform.parent = null;
   previewCamera.camera.enabled = false;
}

function Start()
{
   lastAttacker = GameData.player.isAttacker;
}

function Update ()
{
   DoPulsate();

   if (GameData.player.isAttacker != lastAttacker)
   {
      lastAttacker = GameData.player.isAttacker;
      SwitchGUI((lastAttacker) ? 1 : 2);
   }
}

static function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, colorPulsateDuration) / colorPulsateDuration;
   colorPulsateValue = Mathf.Lerp(0.75, 1.0, t);
}

static function DestroyCursor()
{
   if (cursorObject)
   {
      for (var child : Transform in cursorObject.transform)
         Destroy(child.gameObject);
      Destroy(cursorObject);
   }
}

// 1=UNIT; 2=TOWER
static function NewCursor(entType : int, type : int)
{
   DestroyCursor();

   var prefabName : String;
   // 1=UNIT; 2=TOWER
   if (entType == 1)
   {
      prefabName = Unit.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "AttackGUICursor";
      cursorObject.tag = "";
      cursorObject.GetComponent(Collider).enabled = false;

      var cursorScript = cursorObject.AddComponent(AttackGUICursor);
      //cursorScript.setFromSquad(GameData.player.selectedSquad);

      cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior

   }
   else if (entType == 2)
   {
      prefabName = TowerUtil.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "DefendGUICursor";
      cursorObject.tag = "";
      cursorObject.GetComponent(Collider).enabled = false;

      cursorObject.AddComponent(DefendGUICursor);

      cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
   }
}

static function Reset()
{
   DestroyCursor();
   switch (activeGUI)
   {
      case 0:
         break;
      case 1:
         attackGUI.attackPanel.enabled = false;
         break;
      case 2:
         break;
   }
}


static function SwitchGUI(which : int)
{
   activeGUI = which;
   switch (activeGUI)
   {
      case 0:
         attackGUI.enabled = false;
         attackGUI.attackPanel.enabled = false;
         defendGUI.enabled = false;
         defendGUI.defendPanel.enabled = false;
         networkGUI.enabled = true;
         break;
      case 1:
         attackGUI.enabled = true;
         attackGUI.attackPanel.enabled = false;
         defendGUI.enabled = false;
         defendGUI.defendPanel.enabled = false;
         networkGUI.enabled = false;
         GameData.player.isAttacker=true;
         lastAttacker = true;
         break;
      case 2:
         attackGUI.enabled = false;
         attackGUI.attackPanel.enabled = false;
         defendGUI.enabled = true;
         defendGUI.defendPanel.enabled = false;
         networkGUI.enabled = false;
         GameData.player.isAttacker=false;
         lastAttacker = false;
         break;
   }
}