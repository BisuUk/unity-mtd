//using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

namespace Nuaj.GUI
{
	public static class GUIHelpers
	{
		public static bool		EnableHorizontalGroups = true;

		public enum INFOS_AREA_TYPE
		{
			INFO,
			WARNING,
			ERROR,
			NONE
		}

		public static void	BeginHorizontal()
		{
			if ( EnableHorizontalGroups )
				EditorGUILayout.BeginHorizontal();
		}

		public static void	EndHorizontal()
		{
			if ( EnableHorizontalGroups )
				EditorGUILayout.EndHorizontal();
		}

		public static void	Label( GUIContent _Label )
		{
			BeginHorizontal();
 			GUILayout.Label( _Label );
			EndHorizontal();
		}

		public static void	BoldLabel( GUIContent _Label )
		{
			BeginHorizontal();
			IndentSpace();
			GUILayout.Label( _Label, EditorStyles.boldLabel );
			EndHorizontal();
		}

		/// <summary>
		/// This is used to prefix other controls
		/// </summary>
		/// <param name="_Label"></param>
		public static void	ShrinkableLabel( GUIContent _Label )
		{
 			GUILayout.Label( _Label, GUILayout.Width(150 - Mathf.Max( 0.0f, 350 - Screen.width )) );
		}

		/// <summary>
		/// Displays an info area : an icon with text on the right
		/// </summary>
		/// <param name="_Infos"></param>
		/// <param name="_InfoType"></param>
		public static void	InfosArea( string _Infos, INFOS_AREA_TYPE _InfoType )
		{
			BeginHorizontal();

			Texture	ButtonTexture = null;
			switch ( _InfoType )
			{
				case INFOS_AREA_TYPE.INFO:
					ButtonTexture = GetIcon( "Icons/Info" );
					break;
				case INFOS_AREA_TYPE.WARNING:
					ButtonTexture = GetIcon( "Icons/Warning" );
					break;
				case INFOS_AREA_TYPE.ERROR:
					ButtonTexture = GetIcon( "Icons/Error" );
					break;
			}
			if ( ButtonTexture != null )
				GUILayout.Label( new GUIContent( ButtonTexture ), GUILayout.Width( 32 ) );

			GUILayout.Label( _Infos, EditorStyles.textField );
			EndHorizontal();
		}

		public static bool	CheckBox( GUIContent _Title, bool _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			bool	Result = EditorGUILayout.Toggle( _Value );
			EndHorizontal();

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static bool	CheckBoxNoLabel( GUIContent _Title, bool _Value, float _Width, string _UndoName )
		{
			bool	Result = GUILayout.Toggle( _Value, _Title, GUILayout.Width( _Width ) );

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static bool	CheckBoxButton( GUIContent _Title, bool _Value, float _Width, string _UndoName )
		{
			bool	Result = GUILayout.Button( _Title, GUILayout.Width( _Width ) ) ? !_Value : _Value;

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static System.Enum	ComboBox( GUIContent _Title, System.Enum _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			System.Enum	Result = EditorGUILayout.EnumPopup( _Value );
			EndHorizontal();

			return Result;
		}

		public static bool	Button( GUIContent _Title, params GUILayoutOption[] _Options )
		{
			return GUILayout.Button( _Title, _Options );
		}

		public static string TextBox( GUIContent _Title, string _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			string	Result = EditorGUILayout.TextField( _Value );
			EndHorizontal();

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static float	Slider( GUIContent _Title, float _Value, float _Min, float _Max, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			float	Result = EditorGUILayout.Slider( _Value, _Min, _Max );
			EndHorizontal();

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		/// <summary>
		/// This nice variation on the Sliders adds a button to confirm change
		/// This is most important on parameters that control downscale factors so the user understands it's not a small feat to change these values
		/// </summary>
		/// <param name="_UniqueID"></param>
		/// <param name="_Title"></param>
		/// <param name="_Value"></param>
		/// <param name="_Min"></param>
		/// <param name="_Max"></param>
		/// <param name="_UndoName"></param>
		/// <returns></returns>
		private static Dictionary<string,float>	ms_ID2ValueFloat = new Dictionary<string,float>();
		public static float	SliderWithCheck( string _UniqueID, GUIContent _Title, float _Value, float _Min, float _Max, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );

			// Read back previous value
			if ( !ms_ID2ValueFloat.ContainsKey( _UniqueID ) )
				ms_ID2ValueFloat[_UniqueID] = _Value;
			float	PreviousValue = ms_ID2ValueFloat[_UniqueID];

			// Apply slider
			float	NewValue = EditorGUILayout.Slider( PreviousValue, _Min, _Max );

			// Keep new value but don't apply yet !
			ms_ID2ValueFloat[_UniqueID] = NewValue;

			bool	bApplyChange = false;
			using ( GUIEnabler( NewValue != _Value ) )
				bApplyChange = Button( new GUIContent( "Apply", "Applies the new value" ) );
			EndHorizontal();

			if ( bApplyChange )
			{	// Actual apply
				_Value = NewValue;
				RegisterUndo( _UndoName );
			}

			return _Value;
		}

		public static float	FloatBox( GUIContent _Title, float _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			float	Result = EditorGUILayout.FloatField( _Value );
			EndHorizontal();

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static int	SliderInt( GUIContent _Title, int _Value, int _Min, int _Max, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			int	Result = EditorGUILayout.IntSlider( _Value, _Min, _Max );
			EndHorizontal();

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		/// <summary>
		/// This nice variation on the Sliders adds a button to confirm change
		/// This is most important on parameters that control texture sizes so the user understands it's not a small feat to change these values
		/// </summary>
		/// <param name="_UniqueID"></param>
		/// <param name="_Title"></param>
		/// <param name="_Value"></param>
		/// <param name="_Min"></param>
		/// <param name="_Max"></param>
		/// <param name="_UndoName"></param>
		/// <returns></returns>
		private static Dictionary<string,int>	ms_ID2ValueInt = new Dictionary<string,int>();
		public static int	SliderIntWithCheck( string _UniqueID, GUIContent _Title, int _Value, int _Min, int _Max, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );

			// Read back previous value
			if ( !ms_ID2ValueInt.ContainsKey( _UniqueID ) )
				ms_ID2ValueInt[_UniqueID] = _Value;
			int	PreviousValue = ms_ID2ValueInt[_UniqueID];

			// Apply slider
			int	NewValue = EditorGUILayout.IntSlider( PreviousValue, _Min, _Max );

			// Keep new value but don't apply yet !
			ms_ID2ValueInt[_UniqueID] = NewValue;

			bool	bApplyChange = false;
			using ( GUIEnabler( NewValue != _Value ) )
				bApplyChange = Button( new GUIContent( "Apply", "Applies the new value" ) );
			EndHorizontal();

			if ( bApplyChange )
			{	// Actual apply
				_Value = NewValue;
				RegisterUndo( _UndoName );
			}

			return _Value;
		}

		public static Vector2	Vector2Box( GUIContent _Title, Vector2 _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			Vector2	Result = EditorGUILayout.Vector2Field( _Title.text, _Value );
			EndHorizontal();

			// UNDO
			if ( !Help.Approximately( Result, _Value ) )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static Vector3	Vector3Box( GUIContent _Title, Vector3 _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			Vector3	Result = EditorGUILayout.Vector3Field( _Title.text, _Value );
			EndHorizontal();

			// UNDO
			if ( !Help.Approximately( Result, _Value ) )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static Vector4	Vector4Box( GUIContent _Title, Vector4 _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			Vector4	Result = EditorGUILayout.Vector4Field( _Title.text, _Value );
			EndHorizontal();

			// UNDO
			if ( !Help.Approximately( Result, _Value ) )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static Color	ColorBox( GUIContent _Title, Color _Value, string _UndoName )
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			Color	Result = EditorGUILayout.ColorField( _Value );
			EndHorizontal();

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}
	
		public static T	SelectObject<T>( GUIContent _Title, T _Value, string _UndoName, params GUILayoutOption[] _Layout ) where T:Object
		{
			BeginHorizontal();
			IndentSpace();
			ShrinkableLabel( _Title );
			T	Result = EditorGUILayout.ObjectField( _Value, typeof(T), true, _Layout ) as T;
			EndHorizontal();

			// UNDO
			if ( Result != _Value )
				RegisterUndo( _UndoName );

			return Result;
		}

		public static Texture2D	SelectTexture( GUIContent _Title, Texture2D _Texture, string _UndoName )
		{
			return SelectObject<Texture2D>( _Title, _Texture, _UndoName, GUILayout.Width( 64.0f ), GUILayout.Height( 64.0f ) );
		}

		public static Cubemap	SelectCubeMap( GUIContent _Title, Cubemap _Texture, string _UndoName )
		{
			return SelectObject<Cubemap>( _Title, _Texture, _UndoName, GUILayout.Width( 64.0f ), GUILayout.Height( 64.0f ) );
		}
	
		public static void 	Separate()
		{
			Separate( 10 );
		}
		public static void 	Separate( float _Space )
		{
			GUILayout.Space( _Space );
		}

		public static void	IndentSpace()
		{
			GUILayout.Space( 15.0f * EditorGUI.indentLevel );
		}

		public static bool	FoldOut( ref bool _Folded, string _Caption )
		{
			return _Folded = EditorGUILayout.Foldout( _Folded, _Caption, EditorStyles.foldout );
		}

		public static bool	CustomFoldOut( bool _Folded, GUIContent _Caption )
		{
			return EditorGUILayout.Foldout( _Folded, _Caption, EditorStyles.foldoutPreDrop );
		}

		public static int	TabPage( ref int _SelectedPage, GUIContent[] _Pages )
		{
			return _SelectedPage = GUILayout.Toolbar( _SelectedPage, _Pages );
		}

		public static bool	MessageBox( string _Message, string _OK )
		{
			return EditorUtility.DisplayDialog( "Nuaj'", _Message, _OK );
		}

		public static bool	MessageBox( string _Message, string _OK, string _Cancel )
		{
			return EditorUtility.DisplayDialog( "Nuaj'", _Message, _OK, _Cancel );
		}

		public static void	ShowHelp( string _ModuleHelpURL )
		{
			if ( GUILayout.Button( new GUIContent( GetIcon( "Icons/Help" ) ), GUIStyle.none, GUILayout.Width( 24 ) ) )
				UnityEditor.Help.BrowseURL( "http://www.nuaj.net/user-help/" + _ModuleHelpURL );
		}

		public static Texture	GetIcon( string _ResourceName )
		{
			return Resources.Load( _ResourceName ) as Texture;
		}

		/// <summary>
		/// Little helper class that restores the GUI.enabled state on disposal
		/// </summary>
		private class		GUIEnablerToken : System.IDisposable
		{
			protected bool	m_bOldState = true;

			public GUIEnablerToken( bool _NewEnabledState )
			{
				m_bOldState = UnityEngine.GUI.enabled;
				UnityEngine.GUI.enabled = _NewEnabledState && m_bOldState;
			}

			#region IDisposable Members

			public void Dispose()
			{
				UnityEngine.GUI.enabled = m_bOldState;
			}

			#endregion
		}

		public static System.IDisposable	GUIEnabler( bool _NewEnabledState )
		{
			return new GUIEnablerToken( _NewEnabledState );
		}

		// Current object on which to register UNDOs
		public static Object	ms_UNDOObject = null;
		public static void		RegisterUndo( string _UndoName )
		{
			if ( _UndoName != null )
				Undo.RegisterUndo( ms_UNDOObject, _UndoName );
		}
	}
}