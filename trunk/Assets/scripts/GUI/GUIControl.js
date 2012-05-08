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
static var mainGUI : MainGUI;
static var titleBarGUI : TitleBarGUI;
static var activeGUI : int;

static private var lastAttacker;

function Awake()
{
   attackGUI = GetComponent(AttackGUI);
   defendGUI = GetComponent(DefendGUI);
   networkGUI = GetComponent(NetworkGUI);
   mainGUI = GetComponent(MainGUI);
   titleBarGUI = GetComponent(TitleBarGUI);

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
   lastAttacker = Game.player.isAttacker;
}

function Update()
{
   DoPulsate();

   if (Game.player.isAttacker != lastAttacker)
   {
      lastAttacker = Game.player.isAttacker;
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

      //var cursorScript = cursorObject.AddComponent(AttackGUICursor);
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

static function Resume()
{
   if (Game.player.isAttacker)
      SwitchGUI(1);
   else
      SwitchGUI(2);
}

static function SwitchGUI(which : int)
{
   DestroyCursor();
   activeGUI = which;

   switch (activeGUI)
   {
      // MAIN GUI
      case 0:
         attackGUI.enabled = false;
         attackGUI.attackPanel.enabled = false;
         defendGUI.enabled = false;
         defendGUI.defendPanel.enabled = false;
         titleBarGUI.enabled = false;
         networkGUI.enabled = false;
         mainGUI.enabled = true;
         break;

      // NETWORK GUI
      case 3:
         attackGUI.enabled = false;
         attackGUI.attackPanel.enabled = false;
         defendGUI.enabled = false;
         defendGUI.defendPanel.enabled = false;
         titleBarGUI.enabled = false;
         networkGUI.enabled = true;
         mainGUI.enabled = false;
         break;

      // ATTACKER GUI
      case 1:
         attackGUI.enabled = true;
         attackGUI.attackPanel.enabled = false;
         defendGUI.enabled = false;
         defendGUI.defendPanel.enabled = false;
         titleBarGUI.enabled = true;
         networkGUI.enabled = false;
         Game.player.isAttacker=true;
         lastAttacker = true;
         mainGUI.enabled = false;
         break;

      // DEFENDER GUI
      case 2:
         attackGUI.enabled = false;
         attackGUI.attackPanel.enabled = false;
         defendGUI.enabled = true;
         defendGUI.defendPanel.enabled = false;
         titleBarGUI.enabled = true;
         networkGUI.enabled = false;
         Game.player.isAttacker=false;
         lastAttacker = false;
         mainGUI.enabled = false;
         break;
   }
}