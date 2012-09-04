#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorArea : Transform;
var strengthLabel : UILabel;
var rangeLabel : UILabel;
var rateLabel : UILabel;
var attributeLabel : UILabel;
var selectionBox : SelectionBox;

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
   // LMB
   if (UICamera.currentTouchID == -1)
   {
      if (towerCursor)
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
                     towerCursor.tower.attributePoints[AttributeType.STRENGTH],
                     towerCursor.tower.attributePoints[AttributeType.FIRERATE],
                     towerCursor.tower.attributePoints[AttributeType.RANGE],
                     towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                     towerCursor.tower.FOV.position);
               else
                  Game.control.netView.RPC("CreateTower", RPCMode.Server,
                     towerCursor.tower.type,
                     towerCursor.transform.position, towerCursor.transform.rotation,
                     towerCursor.tower.attributePoints[AttributeType.STRENGTH],
                     towerCursor.tower.attributePoints[AttributeType.FIRERATE],
                     towerCursor.tower.attributePoints[AttributeType.RANGE],
                     towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                     towerCursor.tower.FOV.position);
               // Reset cursor
               towerCursor.SetMode(0);
            }
         }
      }
      else if (abilityCursor)
      {
         // TODO:Check cost

         // Cast ability
         if (!Network.isClient)
            Game.control.CastAbility(
               abilityCursor.ID,
               abilityCursor.transform.position,
               abilityCursor.transform.localScale,
               abilityCursor.color.r,
               abilityCursor.color.g,
               abilityCursor.color.b,
               new NetworkMessageInfo());
         else
            Game.control.netView.RPC("CastAbility", RPCMode.Server,
               abilityCursor.ID,
               abilityCursor.transform.position,
               abilityCursor.transform.localScale,
               abilityCursor.color.r,
               abilityCursor.color.g,
               abilityCursor.color.b);
      }
   }
   // RMB
   else if (UICamera.currentTouchID == -2)
   {
      if (towerCursor)
      {
         if (!isDragging && towerCursor.PrevMode())
         {
            OnAttributeBack();
            DestroyTowerCursor();
         }
      }
      else if (abilityCursor)
      {
         DestroyAbilityCursor();
         Utility.SetActiveRecursive(colorArea, false);
      }
      else
      {
         if (!isDragging)
         {
            Game.player.ClearSelectedTowers();
            SwitchControlSet(0);
            Utility.SetActiveRecursive(colorArea, false);
         }
      }
      isDragging = false;
   }
}

function OnDoubleClick()
{
   if (!towerCursor && UICamera.currentTouchID == -1)
      cameraControl.snapToFocusLocation();
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (isPressed)
         {
            selectionBox._dragStartPosition = Input.mousePosition;
            selectionBox._dragEndPosition = Input.mousePosition;
            // Checks if selections have changed via tower OnMouseDown()
            if (Game.player.selectedTowers.Count>0)
               SwitchControlSet(1);
         }
         else
         {
            if (selectionBox._isDragging)
            {
               Game.player.ClearSelectedTowers();
               selectionBox.Select();
               var somethingSelected : boolean = false;
               for (var go : GameObject in selectionBox.selectedObjects)
               {
                  somethingSelected = true;
                  Game.player.SelectTower(go.GetComponent(Tower), true);
               }
               if (somethingSelected)
                  SwitchControlSet(1);
            }
         }
         selectionBox._isDragging = false;

      break;
   }
}

function OnDrag(delta : Vector2)
{
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (!towerCursor && !abilityCursor)
         {
            selectionBox._isDragging = true;
            selectionBox._dragEndPosition = Input.mousePosition;
         }
      break;

      case -2:
         cameraControl.Rotate(delta);
         isDragging = true;
      break;

      case -3:
         cameraControl.Pan(delta);
      break;
   }
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
   Game.player.ClearSelectedTowers();
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
   var t : Tower = null;
   if (towerCursor)
   {
      Game.player.ClearSelectedTowers();
      t = towerCursor.tower;
   }
   else if (Game.player.selectedTowers.Count > 0)
      t = Game.player.selectedTowers[0];

   if (t)
   {
      strengthLabel.text = t.attributePoints[AttributeType.STRENGTH].ToString();
      rateLabel.text = t.attributePoints[AttributeType.FIRERATE].ToString();
      rangeLabel.text = t.attributePoints[AttributeType.RANGE].ToString();
      attributeLabel.text = "("+t.UsedAttributePoints()+"/"+t.maxAttributePoints+")";
   }
   //else
   //{
   //   for (t in Game.player.selectedTowers)
   //   {
   //   }
   //}
}

function OnStrength()
{
   ModifyAttributePoint(AttributeType.STRENGTH);
}

function OnRate()
{
   ModifyAttributePoint(AttributeType.FIRERATE);
}

function OnRange()
{
   ModifyAttributePoint(AttributeType.RANGE);
}

function ModifyAttributePoint(type : AttributeType)
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   var t : Tower = null;
   if (towerCursor)
      t = towerCursor.tower;
   else if (Game.player.selectedTowers.Count > 0)
      t = Game.player.selectedTowers[0];

   if (t)
   {
      if (UICamera.currentTouchID == -1)
      {
         if (t.ModifyAttributePoints(type, 1))
            OnUpdateAttributes();
         else
            GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
      }
      else if (UICamera.currentTouchID == -2)
      {
         if (t.ModifyAttributePoints(type, -1))
            OnUpdateAttributes();
      }
   }
}

function OnReset()
{
   var t : Tower = null;
   if (towerCursor)
      t = towerCursor.tower;
   else if (Game.player.selectedTowers.Count > 0)
      t = Game.player.selectedTowers[0];

   if (t)
      t.ResetAttributePoints();

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
