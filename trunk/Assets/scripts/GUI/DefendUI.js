#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorArea : Transform;
var numAttributeUpgrades : int = 5;
var strengthLabel : UILabel;
var rangeLabel : UILabel;
var rateLabel : UILabel;
var attributeLabel : UILabel;

private var towerCursor : DefendGUICursor;
private var abilityCursor : AbilityBase;
private var cameraControl : CameraControl;
private var isDragging : boolean;

function Start()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
   isDragging = false;
}

function OnSwitchTo()
{
   cameraControl = Camera.main.GetComponent(CameraControl);
   SwitchControlSet(0);
   UICamera.fallThrough = gameObject;
}

function OnClick()
{
   if (towerCursor)
   {
      // LMB
      if (UICamera.currentTouchID == -1)
      {
         if (towerCursor.legalLocation == false)
            GUIControl.OnScreenMessage("Invalid tower location.", Color.red, 1.5);
         else
         {
            if (towerCursor.NextMode())
            {
               // NOTE: Client is calculating cost, unsecure.
               //Game.player.credits -= costValue;

               // Place tower in scene
               if (!Network.isClient)
                  Game.control.CreateTower(
                     towerCursor.tower.type,
                     towerCursor.transform.position, towerCursor.transform.rotation,
                     towerCursor.tower.range,
                     towerCursor.tower.fov,
                     towerCursor.tower.fireRate,
                     towerCursor.tower.strength,
                     towerCursor.tower.effect,
                     towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                     towerCursor.tower.targetingBehavior,
                     towerCursor.tower.FOV.position);
               else
                  Game.control.netView.RPC("CreateTower", RPCMode.Server,
                     towerCursor.tower.type,
                     towerCursor.transform.position, towerCursor.transform.rotation,
                     towerCursor.tower.range,
                     towerCursor.tower.fov,
                     towerCursor.tower.fireRate,
                     towerCursor.tower.strength,
                     towerCursor.tower.effect,
                     towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                     towerCursor.tower.targetingBehavior,
                     towerCursor.tower.FOV.position);
               // Reset cursor
               towerCursor.SetMode(0);
            }
         }
      }
      // RMB
      else if (UICamera.currentTouchID == -2)
      {
         if (!isDragging && towerCursor.PrevMode())
         {
            OnAttributeBack();
            DestroyTowerCursor();
         }
         isDragging = false;
      }
   }
   else if (abilityCursor)
   {
      if (UICamera.currentTouchID == -1)
      {
         // TODO:Check cost
         /*
         // Cast ability
         if (!Network.isClient)
            Game.control.CastDefendAbility(
               selectedAbility,
               abilityCursor.transform.position,
               abilityCursor.transform.localScale,
               abilityCursor.color.r,
               abilityColor.color.g,
               abilityColor.color.b,
               new NetworkMessageInfo());
         else
            Game.control.netView.RPC("CastDefendAbility", RPCMode.Server, selectedAbility, c.transform.position, c.transform.localScale, abilityColor.r, abilityColor.g, abilityColor.b);
         */            
      }
      else if (UICamera.currentTouchID == -2)
      {
         // Cancel ability cast
         DestroyAbilityCursor();
         Utility.SetActiveRecursive(colorArea, false);
      }
   }
}

function OnDoubleClick()
{
   cameraControl.snapToFocusLocation();
}

function OnDrag(delta : Vector2)
{
   // RMB
   if (UICamera.currentTouchID == -2)
   {
      cameraControl.Rotate(delta);
      isDragging = true;
   }
   else if (UICamera.currentTouchID == -3)
      cameraControl.Pan(delta);
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.R:
         if (!e.shift)
            cameraControl.snapToTopDownView();
         else
            cameraControl.snapToDefaultView(Game.player.isAttacker);
         break;

      case KeyCode.F:
         cameraControl.snapToFocusLocation();
         break;

      case KeyCode.Escape:
         GUIControl.SwitchGUI(4); // temporary
         break;
      }
   }
}

function NewTowerCursor(type : int)
{
   DestroyTowerCursor();
   DestroyAbilityCursor();

   var prefabName : String = TowerUtil.PrefabName(type);
   var cursorObject : GameObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendTowerCursor";
   cursorObject.tag = "";
   cursorObject.GetComponent(Collider).enabled = false;
   towerCursor = cursorObject.AddComponent(DefendGUICursor);
   towerCursor.SetMode(0);

   cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
}

function DestroyTowerCursor()
{
   if (towerCursor)
   {
      for (var child : Transform in towerCursor.transform)
         Destroy(child.gameObject);
      Destroy(towerCursor.gameObject);
   }
}

function NewAbilityCursor(type : int)
{
   DestroyTowerCursor();
   DestroyAbilityCursor();

   var prefabName : String = TowerUtil.PrefabName(type);
   var cursorObject : GameObject = Instantiate(Resources.Load(AbilityBase.GetPrefabName(type), GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendAbilityCursor";
   cursorObject.tag = "";
   cursorObject.SendMessage("MakeCursor", true);
   cursorObject.collider.enabled = false;
   abilityCursor = cursorObject.GetComponent(AbilityBase);
}

function DestroyAbilityCursor()
{
   if (abilityCursor)
   {
      for (var child : Transform in abilityCursor.transform)
         Destroy(child.gameObject);
      Destroy(abilityCursor.gameObject);
   }
}

function OnAttributeBack()
{
   DestroyTowerCursor();
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}

function OnMortarTower()
{
   NewTowerCursor(3);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnRangedTower()
{
   NewTowerCursor(1);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnSlowTower()
{
   NewTowerCursor(4);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnPainterTower()
{
   NewTowerCursor(2);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnBlastAbility()
{
   NewAbilityCursor(101);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnPaintAbility()
{
   NewAbilityCursor(102);
   Utility.SetActiveRecursive(colorArea, true);
}

function SwitchControlSet(newSet : int)
{
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }

   // Switched to attribute set
   if (newSet==1)
      OnUpdateAttributes();
}

function OnUpdateAttributes()
{
   strengthLabel.text = Mathf.RoundToInt(towerCursor.tower.AdjustStrength(towerCursor.tower.strength, true) * numAttributeUpgrades).ToString();
   rangeLabel.text = Mathf.RoundToInt(towerCursor.tower.AdjustRange(towerCursor.tower.range, true) * numAttributeUpgrades).ToString();
   rateLabel.text = Mathf.RoundToInt(towerCursor.tower.AdjustFireRate(towerCursor.tower.fireRate, true) * numAttributeUpgrades).ToString();
   attributeLabel.text = "("+towerCursor.tower.attributePoints+"/"+towerCursor.tower.maxAttributePoints+")";
}

function OnRange()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   if (towerCursor)
   {
      var norm : float = towerCursor.tower.AdjustRange(towerCursor.tower.range, true);
      var val : float = 0.0;
      if (UICamera.currentTouchID == -1)
      {
         if (towerCursor.tower.AddAttributePoint())
         {
            val = norm + 1.0/numAttributeUpgrades;
            if (val > 1.0)
               val = 1.0;
         }
         else
         {
            GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
            return;
         }
      }
      else if (UICamera.currentTouchID == -2)
      {
         val = norm - 1.0/numAttributeUpgrades;
         if (val > 0.0)
            towerCursor.tower.RemoveAttributePoint();
         else
         {
            val = 0.0;
            return;
         }
      }
      towerCursor.tower.SetRange(towerCursor.tower.AdjustRange(val, false));
      OnUpdateAttributes();
   }
}

function OnStrength()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   if (towerCursor)
   {
      var norm : float = towerCursor.tower.AdjustStrength(towerCursor.tower.strength, true);
      var val : float = 0.0;
      if (UICamera.currentTouchID == -1)
      {
         if (towerCursor.tower.AddAttributePoint())
         {
            val = norm + 1.0/numAttributeUpgrades;
            if (val > 1.0)
               val = 1.0;
         }
         else
         {
            GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
            return;
         }
      }
      else if (UICamera.currentTouchID == -2)
      {
         val = norm - 1.0/numAttributeUpgrades;
         if (val > 0.0)
            towerCursor.tower.RemoveAttributePoint();
         else
         {
            val = 0.0;
            return;
         }
      }
      towerCursor.tower.SetStrength(towerCursor.tower.AdjustStrength(val, false));
      OnUpdateAttributes();
   }
}

function OnRate()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   if (towerCursor)
   {
      var norm : float = towerCursor.tower.AdjustFireRate(towerCursor.tower.fireRate, true);
      var val : float = 0.0;
      if (UICamera.currentTouchID == -1)
      {
         if (towerCursor.tower.AddAttributePoint())
         {
            val = norm + 1.0/numAttributeUpgrades;
            if (val > 1.0)
               val = 1.0;
         }
         else
         {
            GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
            return;
         }
      }
      else if (UICamera.currentTouchID == -2)
      {
         val = norm - 1.0/numAttributeUpgrades;
         if (val > 0.0)
            towerCursor.tower.RemoveAttributePoint();
         else
         {
            val = 0.0;
            return;
         }
      }
      towerCursor.tower.SetFireRate(towerCursor.tower.AdjustFireRate(val, false));
      OnUpdateAttributes();
   }
}

function OnReset()
{
   if (towerCursor)
   {
      towerCursor.tower.SetStrength(towerCursor.tower.AdjustStrength(0.0, false));
      towerCursor.tower.SetRange(towerCursor.tower.AdjustRange(0.0, false));
      towerCursor.tower.SetFireRate(towerCursor.tower.AdjustFireRate(0.0, false));
      towerCursor.tower.ResetAttributePoints();
   }
   OnUpdateAttributes();
}

function OnWhite()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.white);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.white);
}

function OnBlue()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.blue);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.blue);
}

function OnMagenta()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.magenta);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.magenta);
}

function OnRed()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.red);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.red);
}

function OnYellow()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.yellow);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.yellow);
}

function OnGreen()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.green);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.green);
}

function OnCyan()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.cyan);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.cyan);
}
